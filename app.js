const { useState, useMemo, useRef, useEffect } = React;

// ---------- іконки (вбудовані SVG, без зовнішніх залежностей) ----------
const Ic = {
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  send: "M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z",
  cal: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  pkg: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12",
  warn: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  x: "M18 6 6 18M6 6l12 12",
  left: "M15 18l-6-6 6-6",
  right: "M9 18l6-6-6-6",
  boxes: "M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42zM7 16.5l-4.74-2.85M7 16.5l5-3M7 16.5v5.17M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3zM17 16.5l-5-3M17 16.5l4.74-2.85M17 16.5v5.17M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8zM12 8 7.26 5.15M12 8l4.74-2.85M12 8v5.5",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  gear: "M20 7h-9M14 17H5M17 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};
function Icon({ d, size = 18, color = "currentColor", style }) {
  return React.createElement("svg", {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", style,
  }, React.createElement("path", { d }));
}

const UNITS = ["шт", "л", "кг", "м"];
const TYPE_LABEL = { drone: "Борт", ammo: "БК", supply: "Розхідник" };
const TYPE_COLOR = { drone: "#5ec8f2", ammo: "#f2a65e", supply: "#8a93a3" };

function uid() { return Math.random().toString(36).slice(2, 10); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function haptic(ms = 15) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

function seedCrew() {
  return {
    components: [
      { id: uid(), name: "Darts «термальні»", qty: 11, unit: "шт", type: "drone", min: 3 },
      { id: uid(), name: "Darts «день»", qty: 12, unit: "шт", type: "drone", min: 3 },
      { id: uid(), name: "Кумулятивно-уламковий", qty: 25, unit: "шт", type: "ammo", min: 5 },
      { id: uid(), name: "ТМ-62", qty: 3, unit: "шт", type: "ammo", min: 1 },
      { id: uid(), name: "Уламковий", qty: 7, unit: "шт", type: "ammo", min: 2 },
      { id: uid(), name: "Кумулятивний", qty: 6, unit: "шт", type: "ammo", min: 2 },
      { id: uid(), name: "Напалм", qty: 20, unit: "л", type: "ammo", min: 5 },
      { id: uid(), name: "Паливо (бензин)", qty: 40, unit: "л", type: "supply", min: 10 },
      { id: uid(), name: "Стяжки", qty: 7, unit: "шт", type: "supply", min: 2 },
      { id: uid(), name: "Скотч", qty: 7, unit: "шт", type: "supply", min: 2 },
    ],
    history: [],
  };
}

// ---------- збереження на пристрої ----------
const STORE_KEY = "oblik_crews_v1";
function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { "Екіпаж 1": seedCrew() };
}
function saveStore(crews) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(crews)); } catch (e) {}
}

function App() {
  const [crews, setCrews] = useState(loadStore);
  const [active, setActive] = useState(() => Object.keys(loadStore())[0]);
  const [tab, setTab] = useState("stock");
  const [loadout, setLoadout] = useState({});
  const crew = crews[active] || crews[Object.keys(crews)[0]];

  useEffect(() => { saveStore(crews); }, [crews]);

  const update = (fn) => setCrews((c) => ({ ...c, [active]: fn(structuredClone(c[active])) }));
  const setCrewLoadout = (fn) => setLoadout((l) => ({ ...l, [active]: fn(l[active] || {}) }));
  const curLoadout = loadout[active] || {};

  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [editComp, setEditComp] = useState(null);
  const [spendComp, setSpendComp] = useState(null);
  const [renameCrew, setRenameCrew] = useState(null);
  const [confirmCrew, setConfirmCrew] = useState(null);
  const pressTimer = useRef(null);

  const startPress = (name) => { pressTimer.current = setTimeout(() => { haptic(20); setRenameCrew(name); }, 500); };
  const endPress = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };

  const logEntry = (cr, kind, items, note) => {
    cr.history.unshift({ date: todayStr(), ts: Date.now(), kind, note: note || "", items });
  };

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon d={Ic.boxes} size={22} color="#f2a65e" />
          <div>
            <div style={S.title}>ОБЛІК · ДРОНИ / БК</div>
            <div style={S.sub}>польовий журнал витрат · v4</div>
          </div>
        </div>
      </header>

      <div style={S.crewBar}>
        {Object.keys(crews).map((name) => (
          <button key={name}
            onClick={() => setActive(name)}
            onTouchStart={() => startPress(name)} onTouchEnd={endPress} onTouchMove={endPress}
            onMouseDown={() => startPress(name)} onMouseUp={endPress} onMouseLeave={endPress}
            onContextMenu={(e) => { e.preventDefault(); setRenameCrew(name); }}
            style={{ ...S.crewTab, ...(name === active ? S.crewTabActive : {}) }}>
            <Icon d={Ic.users} size={13} /> {name}
          </button>
        ))}
        <button style={S.crewAdd} onClick={() => setModal("newCrew")}><Icon d={Ic.plus} size={15} /></button>
      </div>

      <div style={S.segment}>
        <button onClick={() => setTab("stock")} style={{ ...S.seg, ...(tab === "stock" ? S.segOn : {}) }}>
          <Icon d={Ic.pkg} size={14} /> Наявність
        </button>
        <button onClick={() => setTab("history")} style={{ ...S.seg, ...(tab === "history" ? S.segOn : {}) }}>
          <Icon d={Ic.cal} size={14} /> Історія
        </button>
      </div>

      <main className="main-content" style={S.main}>
        {tab === "stock"
          ? <Stock crew={crew} loadout={curLoadout}
              onIntake={() => setModal("intake")} onAdd={() => setModal("addComp")}
              onGear={(c) => setModal({ kind: "gear", comp: c })}
              onAddToLoadout={(id) => setCrewLoadout((lo) => ({ ...lo, [id]: (lo[id] || 0) + 1 }))}
              onLoadoutChange={(id, d) => setCrewLoadout((lo) => {
                const n = (lo[id] || 0) + d; const copy = { ...lo };
                if (n <= 0) delete copy[id]; else copy[id] = n; return copy;
              })}
              onClearLoadout={() => setCrewLoadout(() => ({}))}
              onSummary={() => setModal("summary")}
              onLaunch={(note) => {
                update((cr) => {
                  const items = [];
                  Object.entries(curLoadout).forEach(([id, q]) => {
                    const c = cr.components.find((x) => x.id === id);
                    if (c) { c.qty = Math.max(0, c.qty - q); items.push({ name: c.name, qty: q, unit: c.unit }); }
                  });
                  logEntry(cr, "sortie", items, note);
                  return cr;
                });
                setCrewLoadout(() => ({}));
              }} />
          : <History crew={crew} />}
      </main>

      {modal && modal.kind === "gear" && (
        <Shell title={modal.comp.name} onClose={() => setModal(null)}>
          <button style={S.menuItem} onClick={() => { setEditComp(modal.comp); setModal(null); }}>✎ Редагувати</button>
          <button style={S.menuItem} onClick={() => { setSpendComp(modal.comp); setModal(null); }}>− Списати / витрата</button>
          <button style={{ ...S.menuItem, color: "#ff6b6b" }} onClick={() => { setConfirm(modal.comp); setModal(null); }}>🗑 Видалити</button>
        </Shell>
      )}

      {confirm && (
        <Shell title="Видалити компонент?" onClose={() => setConfirm(null)}>
          <div style={S.confirmText}>Позиція «{confirm.name}» буде видалена назавжди. Історія витрат залишиться.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...S.btnGhost, flex: 1 }} onClick={() => setConfirm(null)}>Скасувати</button>
            <button style={{ ...S.btnDanger, flex: 1 }} onClick={() => {
              update((cr) => { cr.components = cr.components.filter((x) => x.id !== confirm.id); return cr; });
              setCrewLoadout((lo) => { const c = { ...lo }; delete c[confirm.id]; return c; });
              setConfirm(null);
            }}>Видалити</button>
          </div>
        </Shell>
      )}

      {editComp && (
        <EditComponent comp={editComp} onClose={() => setEditComp(null)} onSave={(patch) => {
          update((cr) => { const c = cr.components.find((x) => x.id === editComp.id); if (c) Object.assign(c, patch); return cr; });
          setEditComp(null);
        }} />
      )}

      {spendComp && (
        <SpendComponent comp={spendComp} onClose={() => setSpendComp(null)} onSpend={(amt, note) => {
          update((cr) => {
            const c = cr.components.find((x) => x.id === spendComp.id);
            if (c) { c.qty = Math.max(0, c.qty - amt); logEntry(cr, "manual", [{ name: c.name, qty: amt, unit: c.unit }], note); }
            return cr;
          });
          setSpendComp(null);
        }} />
      )}

      {renameCrew && (
        <RenameCrew current={renameCrew} existing={Object.keys(crews)} canDelete={Object.keys(crews).length > 1}
          onClose={() => setRenameCrew(null)}
          onSave={(newName) => {
            setCrews((c) => {
              const entries = Object.entries(c).map(([k, v]) => [k === renameCrew ? newName : k, v]);
              return Object.fromEntries(entries);
            });
            if (active === renameCrew) setActive(newName);
            setRenameCrew(null);
          }}
          onDelete={() => { setConfirmCrew(renameCrew); setRenameCrew(null); }} />
      )}

      {confirmCrew && (
        <Shell title="Видалити екіпаж?" onClose={() => setConfirmCrew(null)}>
          <div style={S.confirmText}>Екіпаж «{confirmCrew}» буде видалено разом із усіма залишками та історією витрат. Дію не можна скасувати.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...S.btnGhost, flex: 1 }} onClick={() => setConfirmCrew(null)}>Скасувати</button>
            <button style={{ ...S.btnDanger, flex: 1 }} onClick={() => {
              const remaining = Object.keys(crews).filter((n) => n !== confirmCrew);
              setCrews((c) => { const copy = { ...c }; delete copy[confirmCrew]; return copy; });
              setLoadout((l) => { const copy = { ...l }; delete copy[confirmCrew]; return copy; });
              if (active === confirmCrew) setActive(remaining[0]);
              setConfirmCrew(null);
            }}>Видалити</button>
          </div>
        </Shell>
      )}

      {modal === "newCrew" && <NewCrew onClose={() => setModal(null)} existing={Object.keys(crews)}
        onSave={(name) => { setCrews((c) => ({ ...c, [name]: seedCrew() })); setActive(name); setModal(null); }} />}

      {modal === "addComp" && <AddComponent onClose={() => setModal(null)} onSave={(comp) => {
        update((cr) => { cr.components.push({ id: uid(), ...comp }); return cr; }); setModal(null);
      }} />}

      {modal === "intake" && <Intake comps={crew.components} onClose={() => setModal(null)} onSave={(adds) => {
        update((cr) => { adds.forEach((a) => { const c = cr.components.find((x) => x.id === a.id); if (c) c.qty += a.qty; }); return cr; });
        setModal(null);
      }} />}

      {modal === "summary" && <Summary crew={crew} crewName={active} onClose={() => setModal(null)} />}
    </div>
  );
}

function buildSummaryText(crew, crewName) {
  const byType = (t) => crew.components.filter((c) => c.type === t);
  const line = (c) => `• ${c.name}: ${c.qty} ${c.unit}`;
  const section = (label, items) => `${label}\n` + (items.length ? items.map(line).join("\n") : "—");
  return [
    `Екіпаж ${crewName}`,
    "",
    section("Залишок бортів:", byType("drone")),
    "",
    section("БК:", byType("ammo")),
    "",
    section("Витратники:", byType("supply")),
  ].join("\n");
}

function Summary({ crew, crewName, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = buildSummaryText(crew, crewName);

  const copy = async () => {
    haptic(20);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (e) {
      // запасний варіант, якщо clipboard API недоступний
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand("copy"); setCopied(true); } catch (err) {}
      document.body.removeChild(ta);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const byType = (t) => crew.components.filter((c) => c.type === t);
  const Section = ({ label, items }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={S.sumSecLabel}>{label}</div>
      {items.length ? items.map((c) => (
        <div key={c.id} style={S.sumItem}><span>{c.name}</span><b>{c.qty} {c.unit}</b></div>
      )) : <div style={S.sumItemEmpty}>—</div>}
    </div>
  );

  return (
    <Shell title="Залишок по екіпажу" onClose={onClose}>
      <div style={S.sumCrewName}>Екіпаж {crewName}</div>
      <div style={S.sumScroll}>
        <Section label="Залишок бортів" items={byType("drone")} />
        <Section label="БК" items={byType("ammo")} />
        <Section label="Витратники" items={byType("supply")} />
      </div>
      <button className="pop" style={{ ...S.btnPrimary, background: copied ? "#1d3527" : "#1d2735", borderColor: copied ? "#3a7a52" : "#2f4763" }} onClick={copy}>
        {copied ? "✓ Скопійовано" : "Скопіювати текст"}
      </button>
    </Shell>
  );
}

function Stock({ crew, loadout, onIntake, onAdd, onGear, onAddToLoadout, onLoadoutChange, onClearLoadout, onLaunch, onSummary }) {
  const groups = ["drone", "ammo", "supply"];
  const lowCount = crew.components.filter((c) => c.qty <= c.min).length;
  const [note, setNote] = useState("");

  const spentToday = useMemo(() => {
    const m = {};
    crew.history.filter((h) => h.date === todayStr()).forEach((h) => h.items.forEach((it) => {
      m[it.name] = { qty: (m[it.name] ? m[it.name].qty : 0) + it.qty, unit: it.unit };
    }));
    return m;
  }, [crew.history]);

  const loadoutItems = Object.entries(loadout).map(([id, q]) => {
    const c = crew.components.find((x) => x.id === id);
    return c ? { ...c, count: q } : null;
  }).filter(Boolean);

  return (
    <div className="stock-grid">
      {lowCount > 0 && <div className="stock-block" style={S.alert}><Icon d={Ic.warn} size={15} /> Низький залишок: {lowCount} поз.</div>}

      {groups.map((g) => {
        const items = crew.components.filter((c) => c.type === g);
        if (!items.length) return null;
        const canAdd = g === "drone" || g === "ammo";
        return (
          <div key={g} className="stock-block" style={{ marginBottom: 16 }}>
            <div style={{ ...S.groupLabel, color: TYPE_COLOR[g] }}>{TYPE_LABEL[g]}</div>
            {items.map((c) => {
              const low = c.qty <= c.min;
              return (
                <div key={c.id} style={{ ...S.row, ...(low ? S.rowLow : {}) }}>
                  {canAdd && (
                    <button className="pop" style={S.addBtn} onClick={() => { haptic(); onAddToLoadout(c.id); }} disabled={c.qty < 1}><Icon d={Ic.plus} size={16} /></button>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={S.rowName}>{c.name}</div>
                    {spentToday[c.name] ? <div style={S.rowSpent}>−{spentToday[c.name].qty} сьогодні</div> : null}
                  </div>
                  <div style={{ ...S.qty, color: low ? "#ff6b6b" : "#e8edf4" }}>
                    {c.qty}<span style={S.unit}>{c.unit}</span>
                  </div>
                  <button className="pop" style={S.gear} onClick={() => { haptic(); onGear(c); }}><Icon d={Ic.gear} size={16} /></button>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="stock-block" style={S.actions}>
        <button style={S.btnGhost} onClick={onIntake}><Icon d={Ic.download} size={15} /> Надходження</button>
        <button style={S.btnGhost} onClick={onAdd}><Icon d={Ic.plus} size={15} /> Компонент</button>
      </div>

      <div className="stock-block" style={S.loadout}>
        <div style={S.loadoutHead}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon d={Ic.send} size={14} color="#f2a65e" /> Комплектація вильоту</span>
          {loadoutItems.length > 0 && <button style={S.clearBtn} onClick={onClearLoadout}>Очистити</button>}
        </div>
        {loadoutItems.length === 0 ? (
          <div style={S.loadoutHint}>Натисніть «+» біля борту або БК, щоб зібрати виліт</div>
        ) : (
          <React.Fragment>
            {loadoutItems.map((it) => (
              <div key={it.id} style={S.loadoutRow}>
                <span style={{ flex: 1 }}>{it.name}</span>
                <button className="pop" style={S.stepBtn} onClick={() => { haptic(); onLoadoutChange(it.id, -1); }}><Icon d={Ic.minus} size={13} /></button>
                <span style={S.count}>{it.count}</span>
                <button className="pop" style={S.stepBtn} onClick={() => { haptic(); onLoadoutChange(it.id, +1); }} disabled={it.count >= it.qty}><Icon d={Ic.plus} size={13} /></button>
              </div>
            ))}
            <input style={{ ...S.input, marginTop: 10, marginBottom: 0 }} placeholder="Примітка / ціль (необов'язково)"
              value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="pop" style={S.btnLaunch} onClick={() => { haptic(30); onLaunch(note.trim()); setNote(""); }}>
              <Icon d={Ic.send} size={16} /> ВИЛІТ — списати з таблиці
            </button>
          </React.Fragment>
        )}
      </div>

      <div className="stock-block" style={S.todayBox}>
        <div style={S.todayLabel}>Витрачено за добу</div>
        {Object.keys(spentToday).length === 0
          ? <div style={S.todayEmpty}>Витрат сьогодні немає</div>
          : Object.entries(spentToday).map(([n, v]) => (
            <div key={n} style={S.todayRow}><span>{n}</span><b>−{v.qty} {v.unit}</b></div>
          ))}
      </div>

      <button className="stock-block" style={{ ...S.btnGhost, width: "100%", marginTop: 12 }} onClick={() => { haptic(); onSummary(); }}>
        <Icon d={Ic.pkg} size={15} /> Залишок бортів, БК, витратників
      </button>
    </div>
  );
}

function History({ crew }) {
  const [cursor, setCursor] = useState(new Date());
  const [sel, setSel] = useState(todayStr());
  const days = crew.history.reduce((s, h) => { s[h.date] = (s[h.date] || 0) + 1; return s; }, {});
  const y = cursor.getFullYear(), m = cursor.getMonth();
  const first = new Date(y, m, 1).getDay() || 7;
  const total = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 1; i < first; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  const monthName = cursor.toLocaleDateString("uk-UA", { month: "long", year: "numeric" });
  const selEntries = crew.history.filter((h) => h.date === sel);
  const selSum = {};
  selEntries.forEach((h) => h.items.forEach((it) => { selSum[it.name] = { qty: (selSum[it.name] ? selSum[it.name].qty : 0) + it.qty, unit: it.unit }; }));

  return (
    <React.Fragment>
      <div style={S.calHead}>
        <button style={S.calNav} onClick={() => setCursor(new Date(y, m - 1, 1))}><Icon d={Ic.left} size={18} /></button>
        <div style={S.calMonth}>{monthName}</div>
        <button style={S.calNav} onClick={() => setCursor(new Date(y, m + 1, 1))}><Icon d={Ic.right} size={18} /></button>
      </div>
      <div style={S.calGrid}>
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((d) => <div key={d} style={S.calDow}>{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const has = days[ds];
          return (
            <button key={i} onClick={() => setSel(ds)}
              style={{ ...S.calCell, ...(ds === sel ? S.calCellSel : {}), ...(has ? S.calCellHas : {}) }}>
              {d}{has ? <span style={S.dot} /> : null}
            </button>
          );
        })}
      </div>

      <div style={S.dayPanel}>
        <div style={S.dayTitle}>{new Date(sel).toLocaleDateString("uk-UA", { day: "numeric", month: "long" })}</div>
        {selEntries.length === 0 && <div style={S.empty}>Витрат не зафіксовано</div>}
        {Object.keys(selSum).length > 0 && (
          <div style={S.sumBox}>
            <div style={S.sumLabel}>Підсумок за день</div>
            {Object.entries(selSum).map(([n, v]) => (
              <div key={n} style={S.sumRow}><span>{n}</span><b>−{v.qty} {v.unit}</b></div>
            ))}
          </div>
        )}
        {selEntries.map((h, i) => (
          <div key={i} style={S.logCard}>
            <div style={S.logHead}>
              {h.kind === "sortie" ? <Icon d={Ic.send} size={12} color="#f2a65e" /> : <Icon d={Ic.minus} size={12} color="#8a93a3" />}
              {h.kind === "sortie" ? "Виліт" : "Списання"}
              <span style={S.logTime}>{new Date(h.ts).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            {h.items.map((it, j) => <div key={j} style={S.logItem}>{it.name} · −{it.qty} {it.unit}</div>)}
            {h.note ? <div style={S.logNote}>{h.note}</div> : null}
          </div>
        ))}
      </div>
    </React.Fragment>
  );
}

function Shell({ title, onClose, children }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={S.sheetHead}><span>{title}</span><button style={S.close} onClick={onClose}><Icon d={Ic.x} size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

function NewCrew({ onClose, onSave, existing }) {
  const [name, setName] = useState("");
  const ok = name.trim() && !existing.includes(name.trim());
  return (
    <Shell title="Новий екіпаж" onClose={onClose}>
      <input style={S.input} placeholder="Назва екіпажу" value={name} onChange={(e) => setName(e.target.value)} />
      <button disabled={!ok} style={{ ...S.btnPrimary, opacity: ok ? 1 : .4 }} onClick={() => onSave(name.trim())}>Створити</button>
    </Shell>
  );
}

function RenameCrew({ current, existing, canDelete, onClose, onSave, onDelete }) {
  const [name, setName] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    // ставимо курсор у поле, але не виділяємо текст
    const t = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = inputRef.current.value.length;
        try { inputRef.current.setSelectionRange(len, len); } catch (e) {}
      }
    }, 100);
    return () => clearTimeout(t);
  }, []);
  const trimmed = name.trim();
  const ok = trimmed === "" || trimmed === current || !existing.includes(trimmed);
  const finalName = trimmed === "" ? current : trimmed;
  return (
    <Shell title="Перейменувати екіпаж" onClose={onClose}>
      <input ref={inputRef} style={S.input} placeholder={current} value={name} onChange={(e) => setName(e.target.value)} />
      <button disabled={!ok} style={{ ...S.btnPrimary, opacity: ok ? 1 : .4 }} onClick={() => onSave(finalName)}>Зберегти</button>
      {canDelete && (
        <button style={{ ...S.btnDanger, width: "100%" }} onClick={onDelete}>Видалити екіпаж</button>
      )}
    </Shell>
  );
}

function AddComponent({ onClose, onSave }) {
  const [name, setName] = useState(""), [qty, setQty] = useState(""), [unit, setUnit] = useState("шт");
  const [type, setType] = useState("ammo"), [min, setMin] = useState("");
  const ok = name.trim() && qty !== "";
  return (
    <Shell title="Новий компонент" onClose={onClose}>
      <input style={S.input} placeholder="Назва" value={name} onChange={(e) => setName(e.target.value)} />
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...S.input, flex: 1 }} type="number" inputMode="numeric" placeholder="Кількість" value={qty} onChange={(e) => setQty(e.target.value)} />
        <select style={{ ...S.input, width: 90 }} value={unit} onChange={(e) => setUnit(e.target.value)}>
          {UNITS.map((u) => <option key={u}>{u}</option>)}
        </select>
      </div>
      <div style={S.typeRow}>
        {Object.entries(TYPE_LABEL).map(([k, l]) => (
          <button key={k} onClick={() => setType(k)} style={{ ...S.typeBtn, ...(type === k ? { borderColor: TYPE_COLOR[k], color: TYPE_COLOR[k] } : {}) }}>{l}</button>
        ))}
      </div>
      <input style={S.input} type="number" inputMode="numeric" placeholder="Поріг попередження" value={min} onChange={(e) => setMin(e.target.value)} />
      <button disabled={!ok} style={{ ...S.btnPrimary, opacity: ok ? 1 : .4 }}
        onClick={() => onSave({ name: name.trim(), qty: +qty, unit, type, min: +min || 0 })}>Додати</button>
    </Shell>
  );
}

function EditComponent({ comp, onClose, onSave }) {
  const [name, setName] = useState(comp.name), [qty, setQty] = useState(String(comp.qty));
  const [unit, setUnit] = useState(comp.unit), [min, setMin] = useState(String(comp.min));
  const ok = name.trim() && qty !== "";
  return (
    <Shell title="Редагувати" onClose={onClose}>
      <input style={S.input} placeholder="Назва" value={name} onChange={(e) => setName(e.target.value)} />
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...S.input, flex: 1 }} type="number" inputMode="numeric" placeholder="Кількість" value={qty} onChange={(e) => setQty(e.target.value)} />
        <select style={{ ...S.input, width: 90 }} value={unit} onChange={(e) => setUnit(e.target.value)}>
          {UNITS.map((u) => <option key={u}>{u}</option>)}
        </select>
      </div>
      <input style={S.input} type="number" inputMode="numeric" placeholder="Поріг попередження" value={min} onChange={(e) => setMin(e.target.value)} />
      <button disabled={!ok} style={{ ...S.btnPrimary, opacity: ok ? 1 : .4 }}
        onClick={() => onSave({ name: name.trim(), qty: +qty, unit, min: +min || 0 })}>Зберегти</button>
    </Shell>
  );
}

function SpendComponent({ comp, onClose, onSpend }) {
  const [amt, setAmt] = useState(""), [note, setNote] = useState("");
  const ok = +amt > 0;
  return (
    <Shell title={`Списати · ${comp.name}`} onClose={onClose}>
      <div style={S.confirmText}>Наявно: {comp.qty} {comp.unit}</div>
      <input style={S.input} type="number" inputMode="numeric" placeholder={`Скільки списати (${comp.unit})`} value={amt} onChange={(e) => setAmt(e.target.value)} />
      <input style={S.input} placeholder="Примітка (необов'язково)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button disabled={!ok} style={{ ...S.btnPrimary, opacity: ok ? 1 : .4 }} onClick={() => onSpend(+amt, note.trim())}>Списати</button>
    </Shell>
  );
}

function Intake({ comps, onClose, onSave }) {
  const [vals, setVals] = useState({});
  const adds = Object.entries(vals).filter(([, v]) => +v > 0).map(([id, v]) => ({ id, qty: +v }));
  return (
    <Shell title="Надходження" onClose={onClose}>
      <div style={S.scrollList}>
        {comps.map((c) => (
          <div key={c.id} style={S.intakeRow}>
            <span style={{ flex: 1 }}>{c.name} <span style={S.muted}>({c.qty} {c.unit})</span></span>
            <input style={S.miniInput} type="number" inputMode="numeric" placeholder="+0" value={vals[c.id] || ""}
              onChange={(e) => setVals({ ...vals, [c.id]: e.target.value })} />
          </div>
        ))}
      </div>
      <button disabled={!adds.length} style={{ ...S.btnPrimary, opacity: adds.length ? 1 : .4 }} onClick={() => onSave(adds)}>
        Прийняти {adds.length ? `(${adds.length})` : ""}
      </button>
    </Shell>
  );
}

const S = {
  root: { maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#0c0f14", color: "#e8edf4", paddingBottom: 40 },
  header: { padding: "18px 18px 12px", borderBottom: "1px solid #1c222c", display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, letterSpacing: 1, fontSize: 15 },
  sub: { fontSize: 11, color: "#5b6472", letterSpacing: .5 },
  crewBar: { display: "flex", gap: 6, padding: "12px 14px 4px", overflowX: "auto", alignItems: "center" },
  crewTab: { display: "flex", alignItems: "center", gap: 5, background: "#141923", border: "1px solid #1c222c", color: "#8a93a3", padding: "7px 12px", borderRadius: 8, fontSize: 12, whiteSpace: "nowrap", cursor: "pointer" },
  crewTabActive: { background: "#1d2735", borderColor: "#2f4763", color: "#e8edf4" },
  crewAdd: { background: "#141923", border: "1px dashed #2a3340", color: "#5ec8f2", width: 34, height: 34, borderRadius: 8, cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 },
  segment: { display: "flex", gap: 6, padding: "10px 14px" },
  seg: { flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 6, background: "#141923", border: "1px solid #1c222c", color: "#8a93a3", padding: "9px", borderRadius: 8, fontSize: 13, cursor: "pointer" },
  segOn: { background: "#1d2735", borderColor: "#2f4763", color: "#fff" },
  main: { padding: "6px 14px" },
  alert: { display: "flex", alignItems: "center", gap: 8, background: "rgba(242,166,94,.1)", border: "1px solid rgba(242,166,94,.35)", color: "#f2a65e", padding: "9px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14 },
  groupLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" },
  row: { display: "flex", alignItems: "center", gap: 8, background: "#11151d", border: "1px solid #1a202a", borderRadius: 10, padding: "11px 12px", marginBottom: 6 },
  rowLow: { borderColor: "rgba(255,107,107,.4)", background: "rgba(255,107,107,.04)" },
  rowName: { fontSize: 14 },
  rowSpent: { fontSize: 11, color: "#f2a65e", marginTop: 2 },
  qty: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, minWidth: 52, textAlign: "right" },
  unit: { fontSize: 11, color: "#5b6472", marginLeft: 3, fontWeight: 400 },
  addBtn: { background: "#1d2735", border: "1px solid #2f4763", color: "#5ec8f2", width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 },
  gear: { background: "none", border: "none", color: "#4a5364", cursor: "pointer", padding: 4, flexShrink: 0 },
  actions: { display: "flex", gap: 8, marginTop: 8 },
  btnGhost: { flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 6, background: "#141923", border: "1px solid #232c38", color: "#cdd5e0", padding: "11px", borderRadius: 10, fontSize: 13, cursor: "pointer" },
  btnPrimary: { width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, background: "#1d2735", border: "1px solid #2f4763", color: "#fff", padding: "13px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 12 },
  btnDanger: { display: "flex", justifyContent: "center", alignItems: "center", gap: 8, background: "rgba(255,107,107,.15)", border: "1px solid rgba(255,107,107,.5)", color: "#ff6b6b", padding: "13px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 12 },
  btnLaunch: { width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, background: "linear-gradient(180deg,#f2a65e,#d8863a)", border: "none", color: "#1a1206", padding: "14px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 12, letterSpacing: .5 },
  loadout: { marginTop: 16, background: "#11151d", border: "1px solid #2f4763", borderRadius: 12, padding: 14 },
  loadoutHead: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 700, marginBottom: 10 },
  clearBtn: { background: "none", border: "none", color: "#5b6472", fontSize: 12, cursor: "pointer" },
  loadoutHint: { fontSize: 13, color: "#5b6472", padding: "4px 0 2px", lineHeight: 1.5 },
  loadoutRow: { display: "flex", alignItems: "center", gap: 8, padding: "7px 0", fontSize: 14, borderBottom: "1px solid #181e27" },
  stepBtn: { background: "#1d2735", border: "1px solid #2f4763", color: "#cdd5e0", width: 28, height: 28, borderRadius: 7, cursor: "pointer", display: "grid", placeItems: "center" },
  count: { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, minWidth: 24, textAlign: "center" },
  todayBox: { marginTop: 16, background: "#11151d", border: "1px solid #1a202a", borderRadius: 12, padding: 14 },
  todayLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#f2a65e", marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 },
  todayEmpty: { color: "#5b6472", fontSize: 13 },
  todayRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: "#cdd5e0" },
  calHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  calNav: { background: "#141923", border: "1px solid #1c222c", color: "#cdd5e0", width: 36, height: 36, borderRadius: 8, cursor: "pointer", display: "grid", placeItems: "center" },
  calMonth: { fontSize: 15, fontWeight: 600, textTransform: "capitalize" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 },
  calDow: { textAlign: "center", fontSize: 10, color: "#5b6472", padding: "4px 0", fontWeight: 600 },
  calCell: { aspectRatio: "1", background: "#11151d", border: "1px solid #1a202a", color: "#cdd5e0", borderRadius: 8, cursor: "pointer", fontSize: 13, position: "relative", display: "grid", placeItems: "center" },
  calCellHas: { borderColor: "#2f4763" },
  calCellSel: { background: "#1d2735", borderColor: "#f2a65e", color: "#fff" },
  dot: { position: "absolute", bottom: 5, width: 4, height: 4, borderRadius: 4, background: "#f2a65e" },
  dayPanel: { marginTop: 16 },
  dayTitle: { fontSize: 14, fontWeight: 600, marginBottom: 10, textTransform: "capitalize" },
  empty: { color: "#5b6472", fontSize: 13, textAlign: "center", padding: "20px 0" },
  sumBox: { background: "#11151d", border: "1px solid #232c38", borderRadius: 10, padding: 12, marginBottom: 10 },
  sumLabel: { fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "#5b6472", marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" },
  sumRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", color: "#cdd5e0" },
  logCard: { background: "#11151d", border: "1px solid #1a202a", borderRadius: 10, padding: 11, marginBottom: 6 },
  logHead: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, marginBottom: 6 },
  logTime: { marginLeft: "auto", color: "#5b6472", fontWeight: 400 },
  logItem: { fontSize: 13, color: "#cdd5e0", padding: "2px 0" },
  logNote: { fontSize: 12, color: "#8a93a3", marginTop: 5, fontStyle: "italic" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 },
  sheet: { width: "100%", maxWidth: 480, background: "#11151d", borderTop: "1px solid #2a3340", borderRadius: "16px 16px 0 0", padding: 18, paddingBottom: "calc(18px + env(safe-area-inset-bottom))", maxHeight: "88vh", overflowY: "auto" },
  sheetHead: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 16, fontWeight: 700, marginBottom: 14 },
  close: { background: "none", border: "none", color: "#5b6472", cursor: "pointer" },
  menuItem: { width: "100%", textAlign: "left", background: "#0c0f14", border: "1px solid #232c38", color: "#e8edf4", padding: "13px 14px", borderRadius: 10, fontSize: 14, cursor: "pointer", marginBottom: 8 },
  confirmText: { fontSize: 13, color: "#8a93a3", marginBottom: 14, lineHeight: 1.5 },
  input: { width: "100%", background: "#0c0f14", border: "1px solid #232c38", color: "#e8edf4", padding: "11px 12px", borderRadius: 8, fontSize: 16, marginBottom: 10 },
  typeRow: { display: "flex", gap: 6, marginBottom: 10 },
  typeBtn: { flex: 1, background: "#0c0f14", border: "1px solid #232c38", color: "#8a93a3", padding: "9px", borderRadius: 8, fontSize: 12, cursor: "pointer" },
  scrollList: { maxHeight: 320, overflowY: "auto", marginBottom: 10 },
  intakeRow: { display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #181e27", fontSize: 13 },
  miniInput: { width: 64, background: "#0c0f14", border: "1px solid #232c38", color: "#e8edf4", padding: "7px 8px", borderRadius: 6, fontSize: 16, textAlign: "center", fontFamily: "'IBM Plex Mono', monospace" },
  muted: { color: "#5b6472", fontSize: 12 },
  sumCrewName: { fontSize: 15, fontWeight: 700, color: "#f2a65e", marginBottom: 14, fontFamily: "'IBM Plex Mono', monospace" },
  sumScroll: { maxHeight: "55vh", overflowY: "auto", marginBottom: 4 },
  sumSecLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "#8a93a3", marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace" },
  sumItem: { display: "flex", justifyContent: "space-between", fontSize: 14, padding: "5px 0", color: "#cdd5e0", borderBottom: "1px solid #181e27" },
  sumItemEmpty: { fontSize: 14, color: "#5b6472", padding: "5px 0" },
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
