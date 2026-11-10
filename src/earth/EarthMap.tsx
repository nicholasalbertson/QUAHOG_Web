import { useEffect, useRef, useState } from "react";
import type { Road } from "../slice";
import { playState } from "./playState";
import {
  describeLocation,
  frameSouthCoast,
  isMajorRoad,
  panView,
  placeAtScreen,
  placesNear,
  project,
  roadSegmentsNear,
  zoomView,
  type MapView,
} from "./regionMap";
import { HIGHWAYS, PLACES, REGIONS, anchorOf, nearestCity, placeById, regionName, roadsSliceFor, type Place } from "./regions";
import { loadSliceCached } from "./sliceCache";
import { anchorIsSliceOrigin, latLonToLocal, localToLatLon, sliceToLatLon, type LatLon } from "./geo";

export interface MapPose {
  x: number;
  z: number;
  heading: number;
}

const MINI = 176;
const MINI_RANGE = 420;

function livePose(): MapPose {
  const p = playState.player;
  return { x: p.pos.x, z: p.pos.z, heading: p.heading };
}

export function usePlaceRoads(placeId: string): { roads: Road[] | null; aligned: boolean } {
  const place = placeById(placeId);
  const aligned = place?.sliceAligned === true;
  const url = place ? roadsSliceFor(place) : null;
  const [roads, setRoads] = useState<Road[] | null>(null);
  useEffect(() => {
    if (!url) {
      setRoads(null);
      return;
    }
    let cancel = false;
    setRoads(null);
    loadSliceCached(url).then((slice) => {
      if (!cancel) setRoads(slice.roads);
    }).catch(() => {
      if (!cancel) setRoads(null);
    });
    return () => { cancel = true; };
  }, [url]);
  return { roads, aligned };
}

/** Roads for the city the player is actually standing in, not the last teleport. */
export function useLiveCityRoads(placeId: string): { roads: Road[] | null; url: string | null } {
  const [url, setUrl] = useState<string | null>(() => {
    const place = placeById(placeId);
    return place ? roadsSliceFor(place) : null;
  });
  useEffect(() => {
    const place = placeById(placeId);
    if (place) setUrl(roadsSliceFor(place));
  }, [placeId]);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!playState.settled) return;
      const here = localToLatLon(playState.anchor, playState.player.pos.x, playState.player.pos.z);
      const next = roadsSliceFor(nearestCity(here.lat, here.lon));
      setUrl((cur) => (cur === next ? cur : next));
    }, 2000);
    return () => window.clearInterval(id);
  }, []);
  const [roads, setRoads] = useState<Road[] | null>(null);
  useEffect(() => {
    if (!url) {
      setRoads(null);
      return;
    }
    let cancel = false;
    loadSliceCached(url).then((slice) => {
      if (!cancel) setRoads(slice.roads);
    }).catch(() => {
      if (!cancel) setRoads(null);
    });
    return () => { cancel = true; };
  }, [url]);
  return { roads, url };
}

export function liveRoadsAligned(url: string | null, anchor: LatLon): boolean {
  return url === "slice-newbedford.json" && anchorIsSliceOrigin(anchor);
}

export function EarthMinimap({ anchor, placeId, pose }: { anchor: LatLon; placeId: string; pose?: MapPose }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { roads, url } = useLiveCityRoads(placeId);
  const roadsRef = useRef(roads);
  const urlRef = useRef(url);
  roadsRef.current = roads;
  urlRef.current = url;
  const poseRef = useRef(pose);
  poseRef.current = pose;
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  const [caption, setCaption] = useState({ title: "South Coast", detail: "Massachusetts" });

  useEffect(() => {
    const tick = () => {
      const poseNow = poseRef.current ?? livePose();
      setCaption(describeLocation(
        anchorRef.current, poseNow.x, poseNow.z, roadsRef.current,
        liveRoadsAligned(urlRef.current, anchorRef.current),
      ));
    };
    tick();
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, [anchor.lat, anchor.lon]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden || now - last < 100) return;
      last = now;
      const poseNow = poseRef.current ?? livePose();
      const anchorNow = anchorRef.current;
      const { x: px, z: pz, heading } = poseNow;
      const r = MINI / 2;
      ctx.clearRect(0, 0, MINI, MINI);
      ctx.save();
      ctx.beginPath();
      ctx.arc(r, r, r - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#071018";
      ctx.fillRect(0, 0, MINI, MINI);

      ctx.save();
      ctx.translate(r, r);
      ctx.rotate(heading - Math.PI);
      ctx.translate(-r, -r);
      const ppm = r / MINI_RANGE;
      const sx = (x: number) => r + (x - px) * ppm;
      const sy = (z: number) => r + (z - pz) * ppm;

      const segs = roadsRef.current
        ? roadSegmentsNear(roadsRef.current, anchorNow, px, pz, MINI_RANGE, liveRoadsAligned(urlRef.current, anchorNow))
        : [];
      for (const seg of segs) {
        ctx.beginPath();
        ctx.moveTo(sx(seg.x1), sy(seg.z1));
        ctx.lineTo(sx(seg.x2), sy(seg.z2));
        ctx.strokeStyle = seg.major ? "#e2b15a" : "#8d97a8";
        ctx.lineWidth = seg.major ? 2.4 : 1.1;
        ctx.stroke();
      }

      for (const hw of HIGHWAYS) {
        ctx.beginPath();
        let pen = false;
        for (let i = 0; i < hw.points.length - 1; i++) {
          const a = latLonToLocal(anchorNow, hw.points[i]);
          const b = latLonToLocal(anchorNow, hw.points[i + 1]);
          if (Math.hypot(a.x - px, a.z - pz) > MINI_RANGE * 1.2 && Math.hypot(b.x - px, b.z - pz) > MINI_RANGE * 1.2) {
            pen = false;
            continue;
          }
          if (!pen) { ctx.moveTo(sx(a.x), sy(a.z)); pen = true; }
          ctx.lineTo(sx(b.x), sy(b.z));
        }
        ctx.strokeStyle = "rgba(226,177,90,0.45)";
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      const nearby = placesNear(anchorNow, px, pz, 900).slice(0, 4);
      ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      for (const n of nearby) {
        if (n.distance < 12) continue;
        const x = sx(n.x);
        const y = sy(n.z);
        ctx.fillStyle = "#7ad9ff";
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#d5deee";
        ctx.fillText(n.place.name, x, y - 6);
      }
      ctx.restore();

      ctx.fillStyle = "#ff5fa8";
      ctx.beginPath();
      ctx.moveTo(r, r - 9);
      ctx.lineTo(r + 6, r + 7);
      ctx.lineTo(r, r + 3);
      ctx.lineTo(r - 6, r + 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(r, r, r - 1, 0, Math.PI * 2);
      ctx.strokeStyle = "#2c3a5e";
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [anchor.lat, anchor.lon]);

  return (
    <div style={{ width: MINI, pointerEvents: "none" }}>
      <canvas ref={canvasRef} width={MINI} height={MINI} style={{ display: "block", borderRadius: "50%" }} />
      <div style={{ marginTop: 4, textAlign: "center", font: "11px/1.3 ui-sans-serif, system-ui, sans-serif", color: "#d5deee", textShadow: "0 1px 2px #000" }}>
        <b>{caption.title}</b>
        <div style={{ opacity: 0.75, fontSize: 10 }}>{caption.detail}</div>
      </div>
    </div>
  );
}

function paintChart(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  view: MapView,
  pose: MapPose,
  anchor: LatLon,
  roads: Road[] | null,
) {
  ctx.fillStyle = "#071018";
  ctx.fillRect(0, 0, w, h);

  const grid = 10_000;
  ctx.strokeStyle = "rgba(122, 217, 255, 0.05)";
  ctx.lineWidth = 1;
  const origin = project(view, anchor.lat, anchor.lon, w, h);
  const step = grid * view.ppm;
  if (step > 18) {
    for (let x = origin.x % step; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = origin.y % step; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  if (roads && view.ppm > 0.045) {
    const streetZoom = view.ppm > 0.12;
    for (const road of roads) {
      const major = isMajorRoad(road.highway);
      if (!major && !streetZoom) continue;
      if (road.points.length < 2) continue;
      ctx.beginPath();
      let on = false;
      for (let i = 0; i < road.points.length; i++) {
        const ll = sliceToLatLon(road.points[i][0], road.points[i][1]);
        const p = project(view, ll.lat, ll.lon, w, h);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
        if (p.x > -80 && p.x < w + 80 && p.y > -80 && p.y < h + 80) on = true;
      }
      if (!on) continue;
      ctx.strokeStyle = major ? "rgba(180, 190, 205, 0.85)" : "rgba(120, 130, 145, 0.55)";
      ctx.lineWidth = major ? 1.6 : 0.7;
      ctx.stroke();
    }
  }

  for (const hw of HIGHWAYS) {
    ctx.beginPath();
    hw.points.forEach((pt, i) => {
      const p = project(view, pt.lat, pt.lon, w, h);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = "#3a2c14";
    ctx.lineWidth = 7;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.strokeStyle = "#e2b15a";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  if (view.ppm < 0.05) {
    for (const hw of HIGHWAYS) {
      const mid = hw.points[Math.floor(hw.points.length / 2)];
      const p = project(view, mid.lat, mid.lon, w, h);
      if (p.x < 20 || p.x > w - 20 || p.y < 20 || p.y > h - 20) continue;
      ctx.fillStyle = "rgba(7,16,24,0.75)";
      const tw = ctx.measureText(hw.name).width;
      ctx.fillRect(p.x - tw / 2 - 4, p.y - 8, tw + 8, 16);
      ctx.fillStyle = "#f0d7a0";
      ctx.fillText(hw.name, p.x, p.y + 4);
    }
  }

  const labels: { x: number; y: number }[] = [];
  const ordered = [...PLACES].sort((a, b) => Number(!!b.major) - Number(!!a.major));
  for (const place of ordered) {
    const p = project(view, place.lat, place.lon, w, h);
    if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) continue;
    // Zoomed out, the chart is the cities and the highways. Street-level
    // names wait until the view is close enough to read them.
    if (!place.major && view.ppm < 0.028) continue;
    if (place.kind === "highway" && view.ppm < 0.04) continue;
    const primary = !!place.major;
    ctx.beginPath();
    ctx.arc(p.x, p.y, primary ? 4.5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = place.kind === "highway" ? "#e2b15a" : primary ? "#7ad9ff" : "#c5d0e0";
    ctx.fill();
    if (!primary && view.ppm <= 0.04) continue;
    ctx.font = `${primary ? 12 : 10}px ui-sans-serif, system-ui, sans-serif`;
    let ly = p.y - 8;
    for (let n = 0; n < 5; n++) {
      const crowded = labels.some((o) => Math.abs(o.x - p.x) < 78 && Math.abs(o.y - ly) < 13);
      if (!crowded) break;
      ly += 13;
    }
    if (labels.some((o) => Math.abs(o.x - p.x) < 78 && Math.abs(o.y - ly) < 13)) continue;
    labels.push({ x: p.x, y: ly });
    ctx.fillStyle = "#e7eef8";
    ctx.fillText(place.name, p.x, ly);
  }

  const here = localToLatLon(anchor, pose.x, pose.z);
  const pp = project(view, here.lat, here.lon, w, h);
  ctx.save();
  ctx.translate(pp.x, pp.y);
  const north = -Math.cos(pose.heading);
  const east = Math.sin(pose.heading);
  ctx.rotate(Math.atan2(east, north));
  ctx.fillStyle = "#ff5fa8";
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(7, 9);
  ctx.lineTo(0, 4);
  ctx.lineTo(-7, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function EarthBigMap(props: {
  anchor: LatLon;
  placeId: string;
  pose?: MapPose;
  onClose: () => void;
  onTeleport: (placeId: string) => void;
  notice?: string;
  showClose?: boolean;
}) {
  const { anchor, placeId, onClose, onTeleport, notice, showClose = true } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<MapView>({ lat: 41.78, lon: -70.7, ppm: 0.008 });
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const poseRef = useRef(props.pose);
  poseRef.current = props.pose;
  const { roads } = usePlaceRoads(placeId);
  const roadsRef = useRef(roads);
  roadsRef.current = roads;
  const sliceUrlRef = useRef<string | null>(null);
  sliceUrlRef.current = placeById(placeId) ? roadsSliceFor(placeById(placeId)!) : null;
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  const [cursorPlace, setCursorPlace] = useState<string | null>(null);
  const [where, setWhere] = useState({ title: "South Coast", detail: "Massachusetts" });
  useEffect(() => {
    const tick = () => {
      const pose = poseRef.current ?? livePose();
      setWhere(describeLocation(
        anchorRef.current, pose.x, pose.z, roadsRef.current,
        liveRoadsAligned(sliceUrlRef.current, anchorRef.current),
      ));
    };
    tick();
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, [anchor.lat, anchor.lon, placeId]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const framed = { current: false };
    const resize = () => {
      const rect = cvs.parentElement?.getBoundingClientRect();
      cvs.width = Math.max(320, Math.floor(rect?.width ?? window.innerWidth));
      cvs.height = Math.max(240, Math.floor(rect?.height ?? window.innerHeight));
      if (!framed.current && cvs.width > 0) {
        viewRef.current = frameSouthCoast(cvs.width, cvs.height);
        framed.current = true;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 50) return;
      last = now;
      const pose = poseRef.current ?? livePose();
      paintChart(ctx, cvs.width, cvs.height, viewRef.current, pose, anchorRef.current, roadsRef.current);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.hypot(dx, dy) > 4) drag.current.moved = true;
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
    viewRef.current = panView(viewRef.current, dx, dy);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current;
    const was = drag.current;
    drag.current = null;
    if (!cvs || !was || was.moved) return;
    const rect = cvs.getBoundingClientRect();
    const hit = placeAtScreen(viewRef.current, cvs.width, cvs.height, e.clientX - rect.left, e.clientY - rect.top);
    if (hit) onTeleport(hit.id);
  };
  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const factor = e.deltaY > 0 ? 0.85 : 1.18;
    viewRef.current = zoomView(viewRef.current, factor, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      width: cvs.width,
      height: cvs.height,
    });
  };

  const jump = (id: string) => {
    const place = placeById(id);
    const cvs = canvasRef.current;
    if (place && cvs) {
      viewRef.current = { lat: place.lat, lon: place.lon, ppm: Math.max(viewRef.current.ppm, 0.08) };
    }
    setCursorPlace(id);
    onTeleport(id);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", flexDirection: "column", background: "#05080f", color: "#e7eef8", font: "13px/1.4 ui-sans-serif, system-ui, sans-serif", pointerEvents: "auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 14px", borderBottom: "1px solid #243044" }}>
        <div>
          <b style={{ color: "#7ad9ff", letterSpacing: 0.4 }}>THE NARROWS</b>
          <span style={{ opacity: 0.7 }}> · South Coast</span>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{where.title} — {where.detail}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {notice && <span style={{ fontSize: 12, opacity: 0.7, maxWidth: 360 }}>{notice}</span>}
          <button type="button" onClick={() => { viewRef.current = zoomView(viewRef.current, 1.25); }} style={btn}>+</button>
          <button type="button" onClick={() => { viewRef.current = zoomView(viewRef.current, 0.8); }} style={btn}>−</button>
          <button type="button" onClick={() => { const c = canvasRef.current; if (c) viewRef.current = frameSouthCoast(c.width, c.height); }} style={btn}>REGION</button>
          {showClose && <button type="button" onClick={onClose} style={btn}>CLOSE</button>}
        </div>
      </header>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <aside style={{ width: 280, overflow: "auto", borderRight: "1px solid #243044", padding: "8px 0 24px" }}>
          {REGIONS.map((region) => (
            <div key={region.id}>
              <div style={{ padding: "10px 14px 4px", fontSize: 11, letterSpacing: 0.8, color: "#7ad9ff" }}>{region.name.toUpperCase()}</div>
              {PLACES.filter((p) => p.region === region.id).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => jump(p.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                    background: p.id === placeId || p.id === cursorPlace ? "rgba(122,217,255,0.12)" : "transparent",
                    color: "#e7eef8", border: 0, padding: "6px 14px", font: "12px/1.35 ui-sans-serif, system-ui, sans-serif",
                  }}
                >
                  <b>{p.name}</b>
                  <span style={{ opacity: 0.65 }}> · {p.detail}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>
        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
          />
          <div style={{ position: "absolute", right: 16, bottom: 16 }}>
            <EarthMinimap anchor={anchor} placeId={placeId} pose={props.pose} />
          </div>
          <div style={{ position: "absolute", left: 12, bottom: 12, fontSize: 11, opacity: 0.65 }}>
            Drag to pan · scroll to zoom · click a place to go there
            <div>Map roads © OpenStreetMap contributors · Highways are a navigation chart</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  cursor: "pointer",
  border: "1px solid #2c3a5e",
  background: "#101826",
  color: "#e7eef8",
  borderRadius: 6,
  padding: "6px 10px",
  font: "12px ui-sans-serif, system-ui, sans-serif",
};

export function regionCaption(place: Place): string {
  return `${place.name} · ${regionName(place.region)}`;
}

export { anchorOf };
