import {
  CONFIG_DIR_NAME,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { loadPiFootConfig, type ResolvedPiFootConfig } from "../src/config.ts";
import { getPiFootRegistry } from "../src/registry.ts";
import { renderFooter } from "../src/footer.ts";

export default function (pi: ExtensionAPI): void {
  let modelId: string | undefined;
  let thinkingLevel: string | undefined;
  let requestRender = (): void => {};
  let footerConfig: ResolvedPiFootConfig = loadPiFootConfig(
    process.cwd(),
    CONFIG_DIR_NAME,
    process.env,
    false,
  );

  pi.on("session_start", (_event, ctx) => {
    footerConfig = loadPiFootConfig(
      ctx.cwd,
      CONFIG_DIR_NAME,
      process.env,
      ctx.isProjectTrusted(),
    );
    modelId = ctx.model?.id;
    thinkingLevel = ctx.thinkingLevel;

    if (ctx.mode !== "tui") return;

    ctx.ui.setFooter((tui, _theme, footerData) => {
      requestRender = () => tui.requestRender();
      const unsubscribeBranch = footerData.onBranchChange(requestRender);
      const unsubscribeRegistry = getPiFootRegistry().onChange(requestRender);

      return {
        invalidate() {},
        render(width: number): string[] {
          return renderFooter(
            width,
            ctx.ui.theme,
            footerData,
            {
              modelId,
              thinkingLevel,
              entries: ctx.sessionManager.getBranch(),
              contextUsage: ctx.getContextUsage(),
            },
            getPiFootRegistry(),
            footerConfig,
          );
        },
        dispose() {
          unsubscribeBranch();
          unsubscribeRegistry();
          requestRender = () => {};
        },
      };
    });
  });

  pi.on("model_select", (event) => {
    modelId = event.model.id;
    requestRender();
  });

  pi.on("thinking_level_select", (event) => {
    thinkingLevel = event.level;
    requestRender();
  });

  // Pi renders for these events already, but explicitly requesting a render
  // keeps telemetry current while a response is streaming in custom-footer mode.
  pi.on("message_update", () => requestRender());
  pi.on("message_end", () => requestRender());
  pi.on("session_shutdown", () => {
    requestRender = () => {};
  });
}
