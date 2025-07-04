/**
 * Automated Font Scale Test - Generate all screenshots automatically
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
  readonly autoAdvance: boolean;
}

type TestMsg = 
  | { readonly tag: "nextTest" }
  | { readonly tag: "autoTick" };

const fonts: FontStyle[] = ['standard', 'big', 'ansiShadow', 'slant', '3d', 'chunky', 'graffiti', 'cyber', 'neon'];
const fontNames = ['Standard', 'Big', 'ANSI Shadow', 'Slant', '3D ASCII', 'Chunky', 'Graffiti', 'Cyber', 'Neon'];
const scales = [1, 2, 3];

const testComponent: Component<TestModel, TestMsg> = {
  init: Effect.succeed([
    {
      currentFontIndex: 0,
      currentScale: 1,
      testComplete: false,
      screenshotCount: 0,
      autoAdvance: false
    },
    []
  ]),

  update: (msg: TestMsg, model: TestModel) => {
    switch (msg.tag) {
      case "autoTick":
        if (!model.autoAdvance) {
          return Effect.succeed([
            { ...model, autoAdvance: true },
            []
          ]);
        }
        return Effect.succeed([
          { ...model, screenshotCount: model.screenshotCount + 1 },
          [{ tag: "nextTest" }]
        ]);
        
      case "nextTest":
        const currentScaleIndex = scales.indexOf(model.currentScale);
        
        // Move to next scale
        if (currentScaleIndex < scales.length - 1) {
          return Effect.succeed([
            { ...model, currentScale: scales[currentScaleIndex + 1], autoAdvance: false },
            []
          ]);
        }
        
        // Move to next font, reset scale
        if (model.currentFontIndex < fonts.length - 1) {
          return Effect.succeed([
            { 
              ...model, 
              currentFontIndex: model.currentFontIndex + 1,
              currentScale: 1,
              autoAdvance: false
            },
            []
          ]);
        }
        
        // Test complete
        console.log(`\n=== Test Complete ===`);
        console.log(`Generated ${model.screenshotCount + 1} screenshots`);
        console.log(`Screenshots are saved in the current directory as:`);
        console.log(`font-{fontname}-scale-{size}x.png`);
        process.exit(0);
    }
  },

  view: (model: TestModel) => {
    const currentFont = fonts[model.currentFontIndex];
    const currentFontName = fontNames[model.currentFontIndex];
    
    const logo = largeGradientText({
      text: "cli-kit",
      gradient: gradientPresets.rainbow,  // Use rainbow for better visibility
      font: currentFont,
      scale: model.currentScale
    });

    const filename = `font-${currentFont}-scale-${model.currentScale}x.png`;
    
    // Log progress to console
    console.log(`Rendering: ${filename} (${model.currentFontIndex + 1}/${fonts.length} fonts, scale ${model.currentScale}/${scales[scales.length - 1]})`);

    return vstack(
      spacer(2),
      hstack(spacer(3), logo),
      spacer(2),
      hstack(
        spacer(3),
        styledText(`${currentFontName} - Scale ${model.currentScale}x`, style().foreground(Colors.brightWhite).bold())
      ),
      spacer(1),
      hstack(
        spacer(3),
        styledText(filename, style().foreground(Colors.brightCyan))
      )
    );
  },

  subscriptions: (model: TestModel) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService);
      
      // Auto-advance timer - 2 seconds per screenshot
      const timer = Stream.repeatEffect(
        Effect.gen(function* () {
          yield* Effect.sleep(2000);
          return { tag: "autoTick" } as TestMsg;
        })
      );
      
      const keyboard = input.mapKeys((key: KeyEvent) => {
        if (key.key === 'q' || (key.key === 'c' && key.ctrl)) {
          process.exit(0);
        }
        return null;
      });
      
      return Stream.merge(timer, keyboard);
    })
};

const config: AppOptions = {
  fps: 30,
  alternateScreen: true,
  mouse: false
};

console.log("=== Automated Font Scale Test ===");
console.log("Generating screenshots for all fonts at all scales...");
console.log(`Total: ${fonts.length * scales.length} screenshots`);
console.log("Each screenshot will display for 2 seconds");
console.log("Press Ctrl+C to abort\n");

const program = runApp(testComponent, config).pipe(
  Effect.provide(LiveServices)
);

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Font scale test error:", error);
    process.exit(1);
  });