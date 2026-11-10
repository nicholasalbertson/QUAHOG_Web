import { t } from "../i18n/strings";
import { DISCOVERY, discoveryFound } from "../content/discovery";

export function DiscoveryLog() {
  const found = new Set(discoveryFound());
  return (
    <div id="discovery-log">
      <div style={{ color: "#7ad9ff", marginBottom: 8 }}>{t("coast", "discovery")}</div>
      {DISCOVERY.map((pin) => {
        const have = found.has(pin.id);
        return (
          <div key={pin.id} style={{ opacity: have ? 1 : 0.45, marginBottom: 4 }}>
            {have ? "●" : "○"} {pin.name}
            <span style={{ opacity: 0.7 }}> · {pin.detail}</span>
          </div>
        );
      })}
      {found.size === 0 && <div style={{ opacity: 0.7, marginTop: 8 }}>{t("coast", "empty")}</div>}
    </div>
  );
}
