# Technical Implementation Plan: Multi-Source Box Scanner
## Switch Screenshots & Physical Console (3DS / DS) Camera Photos

## 1. Overview & Extended System Architecture

This specification extends the existing **Switch Screenshot Box Scanner** architecture to support physical Nintendo 3DS, DS, and Game Boy screens captured via smartphone cameras. 

While Switch screenshots provide pixel-perfect $16:9$ digital inputs, physical console photos introduce geometric tilt, barrel distortion, screen moiré, variable lighting, and glare. To handle these inputs deterministically without server-side deep learning overhead, this system introduces an interactive **4-Point Perspective Rectification Pipeline** alongside a draft candidate scoring model.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           INPUT HANDLING                                │
│                                                                         │
│  ┌───────────────────────────────┐     ┌─────────────────────────────┐  │
│  │ Digital Switch Screenshot     │     │ Physical 3DS/DS Camera Photo│  │
│  │ (Direct 16:9 Canvas Scale)    │     │ (Requires Perspective Warp) │  │
│  └───────────────┬───────────────┘     └──────────────┬──────────────┘  │
└──────────────────│────────────────────────────────────│─────────────────┘
                   │                                    │
                   ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      CLIENT-SIDE CANVAS & OPENCV.JS                     │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Interactive 4-Point Target Pin Deskewing (cv.warpPerspective)    │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
│                                     │                                   │
│  ┌──────────────────────────────────▼────────────────────────────────┐  │
│  │ Contrast & Moiré Bilateral Normalization                          │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
│                                     │                                   │
│  ┌──────────────────────────────────▼────────────────────────────────┐  │
│  │ Dynamic Grid Segmentation (5x6 Grid Generation)                   │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
│                                     │                                   │
│  ┌──────────────────────────────────▼────────────────────────────────┐  │
│  │ Multi-Candidate Matching Engine (dHash + Color Entropy Score)     │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────────────│───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DRAFT REVIEW & SYNC UI                          │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Interactive 30-Slot Modal with Side-by-Side Crop Verification      │  │
│  │ Top-3 Rank Match Suggestions & Confidence Indicators               │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
│                                     │                                   │
│  ┌──────────────────────────────────▼────────────────────────────────┐  │
│  │ Batch Commit to Retro Pokédex Living Dex Database                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dynamic Input Pipelines

The scanner supports two processing pathways depending on the input source:

| Pipeline Parameter | Digital Switch Screenshot | Physical Console Camera Photo |
| :--- | :--- | :--- |
| **Source Type** | Direct screenshot upload | Camera photo upload / Live capture |
| **Geometric Distortion** | $0\%$ (Fixed aspect ratio) | Variable (Angle, rotation, tilt) |
| **Alignment Method** | Preset crop ratios | Interactive 4-corner mesh warping |
| **Image Preprocessing** | Fixed $1920 \times 1080$ rescale | Bilateral filter + CLAHE normalization |
| **Match Engine** | Single-pass dHash | Multi-candidate dHash + HSV color histogram |

---

## 3. Physical Screen Rectification Engine (OpenCV.js)

When processing a camera photo of a physical 3DS or DS screen, the user or auto-contour detector specifies four screen corners (`top_left`, `top_right`, `bottom_right`, `bottom_left`). `OpenCV.js` transforms the quadrilateral selection into a perfectly flat $1280 \times 720$ canvas.

```typescript
// src/utils/perspectiveUtils.ts

export interface Point2D {
  x: number;
  y: number;
}

export interface ScreenCorners {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
}

/**
 * Transforms an angled physical screen photo into a flat 1280x720 canvas
 */
export async function transformPerspective(
  imageElement: HTMLImageElement,
  corners: ScreenCorners,
  cv: any // OpenCV instance
): Promise<HTMLCanvasElement> {
  const srcMat = cv.imread(imageElement);
  const dstMat = new cv.Mat();

  // Define source coordinates from user target pins
  const srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    corners.topLeft.x, corners.topLeft.y,
    corners.topRight.x, corners.topRight.y,
    corners.bottomRight.x, corners.bottomRight.y,
    corners.bottomLeft.x, corners.bottomLeft.y,
  ]);

  // Target normalized dimensions (1280x720 standard display)
  const targetWidth = 1280;
  const targetHeight = 720;
  const dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    targetWidth, 0,
    targetWidth, targetHeight,
    0, targetHeight,
  ]);

  // Calculate Perspective Transform Matrix and Warp
  const transformMatrix = cv.getPerspectiveTransform(srcCoords, dstCoords);
  const dsize = new cv.Size(targetWidth, targetHeight);
  cv.warpPerspective(srcMat, dstMat, transformMatrix, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

  // Convert normalized Mat to HTMLCanvasElement
  const outputCanvas = document.createElement('canvas');
  cv.imshow(outputCanvas, dstMat);

  // Free native OpenCV memory
  srcMat.delete();
  dstMat.delete();
  srcCoords.delete();
  dstCoords.delete();
  transformMatrix.delete();

  return outputCanvas;
}
```

---

## 4. Camera Photo Cleanup & Moiré Suppression

Physical LCD screens captured by CMOS camera sensors introduce high-frequency pixel moiré patterns and non-uniform lighting shadows. Before extracting hash values, the flattened canvas undergoes filtering:

1. **Bilateral Filtering:** Removes high-frequency screen grid noise while preserving high-contrast edge boundaries of the sprite icon.
2. **Contrast Limited Adaptive Histogram Equalization (CLAHE):** Balances local brightness across the screen to compensate for phone shadows or room ambient lighting.

```typescript
// src/utils/imageNormalization.ts

/**
 * Applies bilateral filter and CLAHE contrast correction to camera input
 */
export function normalizeCameraImage(canvas: HTMLCanvasElement, cv: any): HTMLCanvasElement {
  const src = cv.imread(canvas);
  const dst = new cv.Mat();
  const lab = new cv.Mat();

  // Convert to LAB color space to equalize luminance channel only
  cv.cvtColor(src, lab, cv.COLOR_RGBA2RGB);
  cv.cvtColor(lab, lab, cv.COLOR_RGB2Lab);

  let vectorLab = new cv.MatVector();
  cv.split(lab, vectorLab);

  // Apply CLAHE to L-channel
  let clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
  clahe.apply(vectorLab.get(0), vectorLab.get(0));

  cv.merge(vectorLab, lab);
  cv.cvtColor(lab, dst, cv.COLOR_Lab2RGB);

  // Bilateral filter to smooth moiré lines
  const filtered = new cv.Mat();
  cv.bilateralFilter(dst, filtered, 5, 75, 75);

  const normalizedCanvas = document.createElement('canvas');
  cv.imshow(normalizedCanvas, filtered);

  // Cleanup OpenCV mats
  src.delete(); dst.delete(); lab.delete(); 
  vectorLab.delete(); clahe.delete(); filtered.delete();

  return normalizedCanvas;
}
```

---

## 5. Candidate Ranking & Draft Generation Model

Because physical camera captures carry noise, the matcher returns the **Top 3 Candidate Matches** for each slot alongside a confidence score derived from Hamming distance and visual entropy.

### Multi-Candidate Matching Schema

```typescript
export interface CandidateMatch {
  speciesId: string;
  speciesName: string;
  spriteUrl: string;
  confidenceScore: number; // 0.0 to 1.0
  isShinyCandidate: boolean;
}

export interface SlotScanDraft {
  slotIndex: number; // 0 through 29
  cropImageDataUrl: string; // Original cropped image snippet for review
  isEmpty: boolean;
  confidenceTier: 'HIGH' | 'MEDIUM' | 'LOW';
  selectedCandidate: CandidateMatch;
  alternateCandidates: CandidateMatch[];
}
```

### Confidence Threshold Logic

* **High Confidence ($\ge 0.85$):** Hamming distance $\le 4$. Highlighted in green; auto-selected in draft view.
* **Medium Confidence ($0.60 - 0.84$):** Hamming distance $5 - 8$. Highlighted in yellow; top guess selected but flagged for quick user check.
* **Low Confidence ($< 0.60$):** Hamming distance $> 8$ or high color variance without matching structure. Highlighted in red/orange; requires manual tap or selection.

---

## 6. Interactive Draft Review UI Components

The primary user interface for this feature is a **Side-by-Side Review Grid Modal**. It renders a $5 \times 6$ layout mirroring the user's PC box.

### React Component Architecture

```tsx
// src/components/scanner/DraftReviewModal.tsx

import React, { useState } from 'react';
import { SlotScanDraft, CandidateMatch } from '../../types/scanner';

interface DraftReviewModalProps {
  draftSlots: SlotScanDraft[];
  onConfirmImport: (finalSlots: SlotScanDraft[]) => void;
  onCancel: () => void;
}

export const DraftReviewModal: React.FC<DraftReviewModalProps> = ({
  draftSlots,
  onConfirmImport,
  onCancel,
}) => {
  const [slots, setSlots] = useState<SlotScanDraft[]>(draftSlots);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);

  const handleSelectCandidate = (slotIndex: number, candidate: CandidateMatch) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.slotIndex === slotIndex
          ? { ...slot, selectedCandidate: candidate, confidenceTier: 'HIGH' }
          : slot
      )
    );
    setActiveSlotIndex(null);
  };

  const handleToggleEmpty = (slotIndex: number) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.slotIndex === slotIndex ? { ...slot, isEmpty: !slot.isEmpty } : slot
      )
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Review Scanned Box Draft</h2>
            <p className="text-sm text-slate-400">
              Verify detected Pokémon. Tap any yellow or red slot to switch candidates.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700">
              Cancel
            </button>
            <button
              onClick={() => onConfirmImport(slots)}
              className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 shadow-lg shadow-emerald-900/30"
            >
              Sync {slots.filter(s => !s.isEmpty).length} Pokémon to Dex
            </button>
          </div>
        </div>

        {/* 5x6 Interactive Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-6 gap-3 bg-slate-950">
          {slots.map((slot) => (
            <div
              key={slot.slotIndex}
              className={`relative border rounded-lg p-2 flex flex-col items-center justify-between transition-all cursor-pointer ${
                slot.isEmpty
                  ? 'border-slate-800 bg-slate-900/40 opacity-50'
                  : slot.confidenceTier === 'HIGH'
                  ? 'border-emerald-500/40 bg-slate-900'
                  : slot.confidenceTier === 'MEDIUM'
                  ? 'border-amber-500/60 bg-amber-950/20'
                  : 'border-rose-500/60 bg-rose-950/20'
              }`}
              onClick={() => setActiveSlotIndex(slot.slotIndex)}
            >
              {/* Badge Indicator */}
              <span className={`absolute top-1 left-1 px-1.5 py-0.5 text-[10px] rounded font-mono ${
                slot.confidenceTier === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400' :
                slot.confidenceTier === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                #{slot.slotIndex + 1}
              </span>

              {/* Side-by-Side Comparison Crop vs Matched Sprite */}
              <div className="flex items-center justify-center gap-1 my-2 w-full">
                {/* Original Camera Crop Tile */}
                <img
                  src={slot.cropImageDataUrl}
                  alt="Camera Crop"
                  className="w-10 h-10 object-cover rounded border border-slate-700"
                />
                <span className="text-slate-600 font-bold">→</span>
                {/* Matched Sprite */}
                {!slot.isEmpty ? (
                  <img
                    src={slot.selectedCandidate.spriteUrl}
                    alt={slot.selectedCandidate.speciesName}
                    className="w-10 h-10 object-contain drop-shadow"
                  />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center text-xs text-slate-600 font-mono">
                    EMPTY
                  </div>
                )}
              </div>

              {/* Name & Quick Controls */}
              <div className="w-full text-center">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {slot.isEmpty ? 'Empty Slot' : slot.selectedCandidate.speciesName}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Candidate Override Selector Drawer */}
        {activeSlotIndex !== null && (
          <div className="p-4 bg-slate-800 border-t border-slate-700 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-300">
                Alternative Candidates for Slot #{activeSlotIndex + 1}
              </span>
              <button
                onClick={() => handleToggleEmpty(activeSlotIndex)}
                className="text-xs px-2.5 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
              >
                {slots[activeSlotIndex].isEmpty ? 'Mark as Occupied' : 'Mark as Empty'}
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto py-2">
              {slots[activeSlotIndex].alternateCandidates.map((candidate) => (
                <button
                  key={candidate.speciesId}
                  onClick={() => handleSelectCandidate(activeSlotIndex, candidate)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg hover:border-emerald-500 transition-colors"
                >
                  <img src={candidate.spriteUrl} alt="" className="w-8 h-8" />
                  <div className="text-left">
                    <p className="text-xs font-medium text-white">{candidate.speciesName}</p>
                    <p className="text-[10px] text-slate-400">
                      Match: {(candidate.confidenceScore * 100).toFixed(0)}%
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
```

---

## 7. Extended Execution Milestones

1. **Phase 1 (OpenCV.js Integration):** Import OpenCV.js into the React client; implement `transformPerspective()` with draggable 4-point target handles.
2. **Phase 2 (Moiré & Lighting Pipeline):** Implement bilateral filter and CLAHE contrast correction on normalized $1280 \times 720$ canvases.
3. **Phase 3 (Multi-Generation Hash Index):** Expand `sprite_hashes.json` manifest to include historical menu icon sprites across Gen 3 (GBA), Gen 4/5 (DS), and Gen 6/7 (3DS).
4. **Phase 4 (Interactive Draft Review UI):** Integrate the `DraftReviewModal` component featuring candidate ranking, quick toggles, and side-by-side verification.
5. **Phase 5 (E2E Integration & Testing):** Conduct accuracy validation across Switch screenshots, docked capture card feeds, and physical 3DS/DS camera photos under varying lighting conditions.