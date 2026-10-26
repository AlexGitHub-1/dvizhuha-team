import { createFileRoute } from "@tanstack/react-router";
import { Panel, ScreenShell } from "@/components/ui-kit";
import { SettingsPanel } from "@/components/ui-kit/SettingsPanel";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Настройки — SIEGE: March of Doom" },
      { name: "description", content: "Громкость музыки, эффектов и голосов, яркость, тряска экрана, частицы и другие настройки игры." },
      { property: "og:title", content: "Настройки — SIEGE: March of Doom" },
      { property: "og:description", content: "Настрой звук, изображение и удобство боя под себя." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ScreenShell title="Настройки">
      <Panel className="mx-auto max-w-2xl"><SettingsPanel /></Panel>
    </ScreenShell>
  ),
});
