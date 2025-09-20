/**
 * Font Scale Test - Generate screenshots of all fonts at all scales
 * This will help us analyze scaling quality and identify issues
 */

import { Effect, Stream } from "effect";
import { runApp } from "./src/index.ts";
import { vstack, hstack, text, styledText } from "./src/core/view.ts";
import { spacer } from "./src/layout/index.ts";
import type { Component, Cmd, AppServices, AppOptions, KeyEvent } from "./src/core/types.ts";
import { style, Colors } from "./src/styling/index.ts";
import { InputService } from "./src/services/index.ts";
import { LiveServices } from "./src/services/impl/index.ts";
import { largeGradientText, gradientPresets, type FontStyle } from "./src/components/LargeText.ts";

interface TestModel {
  readonly currentFontIndex: number;
  readonly currentScale: number;
  readonly testComplete: boolean;
  readonly screenshotCount: number;
}

type TestMsg = 
  | { readonly tag: "nextTest" }
  | { readonly tag: "takeScreenshot" };

const fonts: FontStyle[] = ['standard', 'big', 'ansiShadow', 'slant', '3d', 'chunky', 'graffiti', 'cyber', 'neon'];
const fontNames = ['Standard', 'Big', 'ANSI Shadow', 'Slant', '3D ASCII', 'Chunky', 'Graffiti', 'Cyber', 'Neon'];
const scales = [1, 2, 3];

const testComponent: Component<TestModel, TestMsg> = {
  init: Effect.succeed([
    {
      currentFontIndex: 0,
      currentScale: 1,
      testComplete: false,
      screenshotCount: 0
    },
    []
  ]),

  update: (msg: TestMsg, model: TestModel) => {
    switch (msg.tag) {
      case "takeScreenshot":
        // After screenshot, move to next test
        return Effect.succeed([
          { ...model, screenshotCount: model.screenshotCount + 1 },
          [{ tag: "nextTest" }]
        ]);
        
      case "nextTest":
        const currentScaleIndex = scales.indexOf(model.currentScale);
        
        // Move to next scale
        if (currentScaleIndex < scales.length - 1) {
          return Effect.succeed([
            { ...model, currentScale: scales[currentScaleIndex + 1] },
            []
          ]);
        }
        
        // Move to next font, reset scale
        if (model.currentFontIndex < fonts.length - 1) {
          return Effect.succeed([
            { 
              ...model, 
              currentFontIndex: model.currentFontIndex + 1,
              currentScale: 1
            },
            []
          ]);
        }
        
        // Test complete
        return Effect.succeed([
          { ...model, testComplete: true },
          []
        ]);
    }
  },

  view: (model: TestModel) => {
    if (model.testComplete) {
      return vstack(
        spacer(5),
        hstack(
          spacer(10),
          styledText("🎉 Font Scale Test Complete!", style().foreground(Colors.brightGreen).bold())
        ),
        spacer(1),
        hstack(
          spacer(10),
          styledText(`Generated ${model.screenshotCount} screenshots`, style().foreground(Colors.brightWhite))
        ),
        spacer(1),
        hstack(
          spacer(10),
          styledText("Screenshots saved to current directory", style().foreground(Colors.gray))
        ),
        spacer(1),
        hstack(
          spacer(10),
          styledText("Press 'q' to quit", style().foreground(Colors.brightCyan))
        )
      );
    }

    const currentFont = fonts[model.currentFontIndex];
    const currentFontName = fontNames[model.currentFontIndex];
    
    const logo = largeGradientText({
      text: "tuix",
      gradient: gradientPresets.neon,
      font: currentFont,
      scale: model.currentScale
    });

    const filename = `font-${currentFont}-scale-${model.currentScale}x.png`;

    return vstack(
      spacer(3),
      hstack(spacer(5), logo),
      spacer(3),
      hstack(
        spacer(5),
        styledText(`Font: ${currentFontName} | Scale: ${model.currentScale}x`, style().foreground(Colors.brightWhite).bold())
      ),
      spacer(1),
      hstack(
        spacer(5),
        styledText(`Screenshot: ${filename}`, style().foreground(Colors.brightCyan))
      ),
      spacer(1),
      hstack(
        spacer(5),
        styledText(`Progress: ${model.currentFontIndex + 1}/${fonts.length} fonts, Scale ${model.currentScale}/${scales[scales.length - 1]}`, style().foreground(Colors.gray))
      ),
      spacer(1),
      hstack(
        spacer(5),
        styledText("Press SPACE to take screenshot and continue, 'q' to quit", style().foreground(Colors.yellow))
      )
    );
  },

  subscriptions: (model: TestModel) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService);
      
      const keyboard = input.mapKeys((key: KeyEvent) => {
        if (key.key === 'q' || (key.key === 'c' && key.ctrl)) {
          process.exit(0);
        }
        
        if (key.key === ' ' && !model.testComplete) {
          return { tag: "takeScreenshot" };
        }
        
        return null;
      });
      
      return keyboard;
    })
};

const config: AppOptions = {
  fps: 30,
  alternateScreen: true,
  mouse: false
};

console.log("=== Font Scale Test ===");
console.log("This will test all fonts at all scales with 'tuix' text");
console.log("Screenshots will be saved as: font-{name}-scale-{size}x.png");
console.log("Total screenshots to generate:", fonts.length * scales.length);
console.log("Starting test...\n");

const program = runApp(testComponent, config).pipe(
  Effect.provide(LiveServices)
);

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Font scale test error:", error);
    process.exit(1);
  });
