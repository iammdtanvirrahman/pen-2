import React from 'react';
import { GameSettings } from '../types';
import { assetStore } from '../assetsManager';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (s: GameSettings) => void;
  onBack: () => void;
  onToast: (msg: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onBack,
  onToast,
}) => {
  const handleBenchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = async () => {
      if (typeof fr.result === 'string') {
        await assetStore.setBench(fr.result);
        onToast('Bench image applied');
      }
    };
    fr.readAsDataURL(file);
  };

  const handlePenUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      if (typeof fr.result === 'string') {
        const penData = {
          n: file.name.replace(/\.\w+$/, '').slice(0, 18) || 'Custom pen',
          src: fr.result,
          len: 84,
          band: -10,
          origin: 'local' as const,
        };
        assetStore.addPen(penData);
        try {
          const customPens = assetStore.pens
            .filter((p) => p.origin === 'local')
            .map((p) => ({ n: p.n, src: p.src, len: p.len, band: p.band }));
          localStorage.setItem('pg.customPens', JSON.stringify(customPens));
        } catch (err) {
          onToast('Pen added for this session, but browser storage is full');
        }
        onToast('Pen added — choose it in match setup');
      }
    };
    fr.readAsDataURL(file);
  };

  const handleResetAssets = () => {
    assetStore.resetAssets();
    onToast('Custom assets reset');
  };

  return (
    <div className="p" role="dialog" aria-modal="true">
      <h2>Settings</h2>

      <label>
        Sound
        <input
          type="checkbox"
          checked={!!settings.snd}
          onChange={(e) => onUpdateSettings({ ...settings, snd: e.target.checked ? 1 : 0 })}
        />
      </label>

      <label>
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.vol}
          onChange={(e) => onUpdateSettings({ ...settings, vol: Number(e.target.value) })}
        />
      </label>

      <label>
        Reduced motion
        <input
          type="checkbox"
          checked={!!settings.rm}
          onChange={(e) => onUpdateSettings({ ...settings, rm: e.target.checked })}
        />
      </label>

      <label>
        Pen hops (Z-axis jumps)
        <input
          type="checkbox"
          checked={!!settings.hop}
          onChange={(e) => onUpdateSettings({ ...settings, hop: e.target.checked ? 1 : 0 })}
        />
      </label>

      <label>
        Ink trails on desk
        <input
          type="checkbox"
          checked={!!settings.ink}
          onChange={(e) => onUpdateSettings({ ...settings, ink: e.target.checked ? 1 : 0 })}
        />
      </label>

      <label>
        Haptic vibration
        <input
          type="checkbox"
          checked={!!settings.vib}
          onChange={(e) => onUpdateSettings({ ...settings, vib: e.target.checked ? 1 : 0 })}
        />
      </label>

      <label>
        Scoreboard HUD
        <input
          type="checkbox"
          checked={!!settings.hud}
          onChange={(e) => onUpdateSettings({ ...settings, hud: e.target.checked ? 1 : 0 })}
        />
      </label>

      <label>
        Flick strength
        <select
          value={settings.pw}
          onChange={(e) => onUpdateSettings({ ...settings, pw: Number(e.target.value) })}
        >
          <option value={0.75}>Gentle</option>
          <option value={1}>Normal</option>
          <option value={1.25}>Strong</option>
        </select>
      </label>

      <label>
        Bench surface
        <select
          value={settings.phy}
          onChange={(e) =>
            onUpdateSettings({ ...settings, phy: e.target.value as 'classic' | 'slick' | 'grippy' })
          }
        >
          <option value="classic">Classic</option>
          <option value="slick">Slippery</option>
          <option value="grippy">Grippy</option>
        </select>
      </label>

      <label>
        Aim assist line
        <input
          type="checkbox"
          checked={!!settings.asst}
          onChange={(e) => onUpdateSettings({ ...settings, asst: e.target.checked ? 1 : 0 })}
        />
      </label>

      <label>
        Accuracy variation
        <input
          type="checkbox"
          checked={!!settings.acc}
          onChange={(e) => onUpdateSettings({ ...settings, acc: e.target.checked ? 1 : 0 })}
        />
      </label>

      <h3>Custom assets (this session)</h3>
      <label>
        Bench image
        <input type="file" accept="image/*" onChange={handleBenchUpload} />
      </label>

      <label>
        Add pen skin
        <input type="file" accept="image/*" onChange={handlePenUpload} />
      </label>

      <p className="mu">
        Pen skins: transparent PNG with the pen pointing right. Strength and surface apply from the next match.
      </p>

      <div className="g2">
        <button type="button" onClick={handleResetAssets}>
          Reset assets
        </button>
        <button type="button" className="pr" onClick={onBack}>
          Done
        </button>
      </div>
    </div>
  );
};
