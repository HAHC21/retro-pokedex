# Technical Implementation Plan: Switch Screenshot Box Scanner

## 1. Overview & System Architecture

This feature enables non-modded, legitimate players (Switch 1, Switch 2, and Pokémon HOME users) to rapidly log up to 30 Pokémon per PC box by uploading a single screenshot.

### Processing Strategy: Client-Side First Hybrid
- **Client-Side (React / Web Canvas):** Responsible for interactive grid alignment/cropping, image normalization, perceptual hashing (pHash) generation, and preliminary fast matching.
- **Server-Side (FastAPI - Optional / Fallback):** Handles high-accuracy OpenCV template matching for ambiguous slots, edge cases, dark modes, or alternate form identification.

```
┌───────────────────────────────────────────────────────────┐
│                      REACT FRONTEND                       │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────┐  │
│  │ File Upload /    │─>│ Canvas Crop &   │─>│ Client   │  │
│  │ Switch QR Modal  │  │ Grid Alignment  │  │ pHash    │  │
│  └──────────────────┘  └─────────────────┘  └────┬─────┘  │
└──────────────────────────────────────────────────│────────┘
                                                   │ (Low Confidence Slots)
                                                   ▼
┌───────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND                      │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ OpenCV Template Matcher / Form & Shiny Analysis    │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

---

## 2. Core Technical Challenges & Solutions

| Challenge | Cause | Solution |
| :--- | :--- | :--- |
| **Resolution Differences** | Handheld ($720\text{p}$) vs Docked ($1080\text{p}$) vs $4\text{K}$ Capture Cards | Normalize incoming images to a fixed $1920 \times 1080$ canvas resolution before cropping. |
| **Grid Shifts & Offsets** | UI differences between *Scarlet/Violet*, *Sword/Shield*, and *Pokémon HOME* | Implement UI-preset selection (e.g., "Gen 9 Box", "HOME Box") with user-adjustable drag anchor points. |
| **Empty Slots** | Blank slots in PC boxes causing false positive matches | Compute color entropy / variance per crop tile. Empty tiles fall below a variance threshold and are skipped. |
| **Shiny / Gender Variants** | Subtle pixel changes or small icon overlays | Secondary HSV color histogram check on matched slots to distinguish normal vs. shiny palettes. |

---

## 3. Data Requirements & Asset Pipeline

### Reference Sprite Fingerprint Table
A JSON manifest mapping species IDs to pre-calculated perceptual hashes (`dHash` / `aHash`).

```json
// public/data/sprite_hashes_gen9.json
{
  "0906_normal": "f0e2a4b870c1d3f0",
  "0906_shiny":  "f0e2a4b870c1d3f1",
  "0909_normal": "a1b2c3d4e5f60718",
  "0909_shiny":  "a1b2c3d4e5f60719"
}
```

---

## 4. Client-Side Implementation (React)

### Canvas Normalization & Crop Pipeline

```typescript
// src/utils/scannerUtils.ts

export interface BoxCropRegion {
  startXRatio: number; // e.g. 0.285 (28.5% from left)
  startYRatio: number; // e.g. 0.180 (18.0% from top)
  boxWidthRatio: number; // Total grid width relative to screen width
  boxHeightRatio: number; // Total grid height relative to screen height
}

export const PRESETS: Record<string, BoxCropRegion> = {
  GEN9_SCARLET_VIOLET: {
    startXRatio: 0.285,
    startYRatio: 0.182,
    boxWidthRatio: 0.650,
    boxHeightRatio: 0.680
  },
  POKEMON_HOME_MOBILE: {
    startXRatio: 0.080,
    startYRatio: 0.220,
    boxWidthRatio: 0.840,
    boxHeightRatio: 0.580
  }
};

/**
 * Extracts 30 uniform crop tiles from an uploaded box screenshot
 */
export async function extractBoxTiles(
  imageFile: File,
  preset: BoxCropRegion
): Promise<ImageData[]> {
  const img = await loadImage(imageFile);
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, 1920, 1080);

  const tiles: ImageData[] = [];
  const gridStartX = canvas.width * preset.startXRatio;
  const gridStartY = canvas.height * preset.startYRatio;
  const gridW = canvas.width * preset.boxWidthRatio;
  const gridH = canvas.height * preset.boxHeightRatio;

  const cellW = gridW / 6; // 6 columns
  const cellH = gridH / 5; // 5 rows

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      const cellX = gridStartX + col * cellW;
      const cellY = gridStartY + row * cellH;
      
      // Grab center square of each slot to avoid grid lines
      const tile = ctx.getImageData(
        cellX + cellW * 0.1,
        cellY + cellH * 0.1,
        cellW * 0.8,
        cellH * 0.8
      );
      tiles.push(tile);
    }
  }

  return tiles;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
```

### Difference Hash (dHash) Algorithm in JS

```typescript
/**
 * Calculates a 64-bit dHash string for an ImageData object
 */
export function calculateDHash(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = 9;
  canvas.height = 8;
  const ctx = canvas.getContext('2d')!;

  // Temporary canvas to downscale
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  tempCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

  ctx.drawImage(tempCanvas, 0, 0, 9, 8);
  const smallData = ctx.getImageData(0, 0, 9, 8).data;

  let hashBitString = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const leftIdx = (row * 9 + col) * 4;
      const rightIdx = (row * 9 + (col + 1)) * 4;

      // Greyscale intensity
      const leftVal = (smallData[leftIdx] + smallData[leftIdx + 1] + smallData[leftIdx + 2]) / 3;
      const rightVal = (smallData[rightIdx] + smallData[rightIdx + 1] + smallData[rightIdx + 2]) / 3;

      hashBitString += leftVal > rightVal ? '1' : '0';
    }
  }

  // Convert binary bitstring to hexadecimal
  return BigInt('0b' + hashBitString).toString(16).padStart(16, '0');
}

/**
 * Hamming Distance calculation between two hex hashes
 */
export function hammingDistance(hash1: string, hash2: string): number {
  let val1 = BigInt('0x' + hash1);
  let val2 = BigInt('0x' + hash2);
  let xor = val1 ^ val2;
  
  let distance = 0;
  while (xor > 0n) {
    distance += Number(xor & 1n);
    xor >>= 1n;
  }
  return distance;
}
```

---

## 5. Server-Side Fallback Implementation (FastAPI)

For low-confidence client matches or batch verification, the backend provides an OpenCV-powered template matching endpoint.

### Dependencies (`requirements.txt`)
```text
fastapi>=0.110.0
opencv-python-headless>=4.9.0
numpy>=1.26.0
pydantic>=2.0
```

### FastAPI Service (`app/services/ocr_service.py`)

```python
import cv2
import numpy as np
from typing import List, Dict, Optional

class BoxScannerService:
    def __init__(self, reference_sprites: Dict[str, np.ndarray]):
        # Dict mapping "0906_normal" -> OpenCV Image matrix
        self.reference_sprites = reference_sprites

    def match_slot_opencv(self, tile_bytes: bytes, top_k: int = 3) -> List[Dict]:
        """
        Uses normalized cross-correlation template matching to identify low-confidence slots.
        """
        nparr = np.frombuffer(tile_bytes, np.uint8)
        tile_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Check for empty tile via variance threshold
        gray_tile = cv2.cvtColor(tile_img, cv2.COLOR_BGR2GRAY)
        if np.var(gray_tile) < 100.0:
            return [{"species_id": "EMPTY", "confidence": 1.0}]

        results = []
        for sprite_id, ref_img in self.reference_sprites.items():
            # Resize ref image to match tile dimensions
            resized_ref = cv2.resize(ref_img, (tile_img.shape[1], tile_img.shape[0]))
            
            # Perform Template Matching
            res = cv2.matchTemplate(tile_img, resized_ref, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, _ = cv2.minMaxLoc(res)
            
            results.append({
                "species_id": sprite_id,
                "confidence": float(max_val)
            })

        # Sort by match confidence score descending
        results.sort(key=lambda x: x["confidence"], reverse=True)
        return results[:top_k]
```

### API Route (`app/routers/scanner.py`)

```python
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/scanner", tags=["scanner"])

class ScanMatchResult(BaseModel):
    slot_index: int
    species_id: str
    confidence: float
    is_shiny: bool = False

@router.post("/verify-low-confidence", response_model=List[ScanMatchResult])
async def verify_low_confidence_slots(
    files: List[UploadFile] = File(...),
):
    """
    Accepts crop tile images for ambiguous slots and returns verified species candidates.
    """
    if len(files) > 30:
        raise HTTPException(status_code=400, detail="Cannot process more than 30 tiles at once.")

    results = []
    for idx, file in enumerate(files):
        tile_bytes = await file.read()
        # Call BoxScannerService matching logic here
        matches = scanner_service.match_slot_opencv(tile_bytes)
        top_match = matches[0]
        
        results.append(ScanMatchResult(
            slot_index=idx,
            species_id=top_match["species_id"],
            confidence=top_match["confidence"]
        ))

    return results
```

---

## 6. User Experience & Verification Flow

To guarantee accuracy without frustrating users, scanned results are presented in a 30-slot preview modal before committing to the database:

1. **Upload / Drop:** User selects a Switch box screenshot.
2. **Scan Execution:**
   - 30 tiles extracted client-side.
   - Local dHash matches tiles against the sprite index in under $100\text{ms}$.
   - High-confidence matches ($\text{Hamming Distance} \le 5$) are automatically confirmed.
   - Low-confidence matches ($\text{Hamming Distance} > 5$) are flagged with a yellow highlight.
3. **Interactive Grid Review:**
   - User sees a $5 \times 6$ grid mirroring their in-game box.
   - Hovering/clicking a slot shows the original screenshot crop alongside the matched sprite.
   - Clicking an incorrect slot opens a fast search dropdown to override the species or toggle **NORMAL / SHINY**.
4. **Batch Commit:** User clicks **"Import 30 Pokémon to Living Dex"** to update their profile in a single batch operation.

---

## 7. Next Steps & Execution Milestones

1. **Phase 1 (Frontend Core):** Implement canvas cropping logic, coordinate preset selector, and dHash computation in React.
2. **Phase 2 (Asset Manifest):** Generate the `sprite_hashes_gen9.json` database from the existing app sprite sheets.
3. **Phase 3 (Review UI Component):** Build the $5 \times 6$ interactive verification grid modal.
4. **Phase 4 (Backend Integration):** Implement the OpenCV FastAPI route for edge cases and low-confidence slot verification.