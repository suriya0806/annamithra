import React, { useState, useEffect } from "react";
import {
  Globe,
  Image as ImageIcon,
  ImageOff,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Utensils,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { WEB_FOOD_PRESETS } from "./dishImages";

export default function FoodImageWebInput({
  imageUrl,
  onChange,
  dishName = "",
  category = ""
}) {
  const [isOpen, setIsOpen] = useState(!!imageUrl);
  const [showPresets, setShowPresets] = useState(false);
  const [presetCategory, setPresetCategory] = useState("Biryani & Rice");
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Sync open state if imageUrl changes externally
  useEffect(() => {
    if (imageUrl) {
      setIsOpen(true);
      setImageError(false);
      setImageLoaded(false);
    }
  }, [imageUrl]);

  // Auto-match preset category based on food category if available
  useEffect(() => {
    if (category) {
      const catLower = category.toLowerCase();
      if (catLower.includes("biryani") || catLower.includes("rice")) {
        setPresetCategory("Biryani & Rice");
      } else if (catLower.includes("curry") || catLower.includes("gravy") || catLower.includes("dal")) {
        setPresetCategory("Curries & Gravies");
      } else if (catLower.includes("starter") || catLower.includes("snack") || catLower.includes("appetizer")) {
        setPresetCategory("Starters & Snacks");
      } else if (catLower.includes("bread") || catLower.includes("roti") || catLower.includes("naan") || catLower.includes("dosa")) {
        setPresetCategory("Breads & Breakfast");
      } else if (catLower.includes("dessert") || catLower.includes("beverage") || catLower.includes("drink")) {
        setPresetCategory("Desserts & Beverages");
      } else if (catLower.includes("combo") || catLower.includes("chinese")) {
        setPresetCategory("Fast Food & Chinese");
      }
    }
  }, [category]);

  const handleClear = () => {
    onChange("");
    setImageError(false);
    setImageLoaded(false);
  };

  const handleSelectPreset = (url) => {
    onChange(url);
    setImageError(false);
    setImageLoaded(false);
  };

  // 1. Collapsed state: No photo attached
  if (!isOpen && !imageUrl) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          background: "var(--bg-surface-subtle)",
          borderRadius: "var(--radius-md)",
          border: "1px dashed var(--border-default)",
          gap: "12px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)"
            }}
          >
            <Utensils size={18} />
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
              Photo (Optional)
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
              No photo selected. Having a photo is optional.
            </div>
          </div>
        </div>
        <button
          type="button"
          className="secondary-btn"
          style={{
            fontSize: "12px",
            padding: "6px 12px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "var(--bg-surface)",
            borderColor: "var(--primary-300, #93c5fd)"
          }}
          onClick={() => {
            setIsOpen(true);
            setShowPresets(false);
          }}
        >
          <Globe size={14} color="var(--primary-600)" />
          Add Image from Web
        </button>
      </div>
    );
  }

  // 2. Expanded state: Web image URL & presets
  return (
    <div
      style={{
        padding: "14px",
        background: "var(--bg-surface-subtle)",
        borderRadius: "var(--radius-md)",
        border: "1.5px solid var(--border-default)",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Globe size={16} color="var(--primary-600)" />
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
            Food Image (Optional)
          </span>
          <span
            style={{
              fontSize: "10.5px",
              padding: "1px 6px",
              background: "#ecfdf5",
              color: "#047857",
              borderRadius: "10px",
              fontWeight: 600,
              border: "1px solid #a7f3d0"
            }}
          >
            From Web
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              color: "var(--primary-600)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 6px"
            }}
            onClick={() => setShowPresets(!showPresets)}
          >
            <Sparkles size={13} />
            {showPresets ? "Hide Web Presets" : "Browse Web Presets"}
            {showPresets ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {imageUrl ? (
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "#dc2626",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 6px"
              }}
              onClick={handleClear}
              title="Remove photo (makes this food photoless)"
            >
              <Trash2 size={13} />
              Remove Photo
            </button>
          ) : (
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "12px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px"
              }}
              onClick={() => setIsOpen(false)}
            >
              <X size={13} />
              Close
            </button>
          )}
        </div>
      </div>

      {/* URL Input Row */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="url"
            placeholder="Paste image URL from web (e.g. https://... or pick preset below)"
            value={imageUrl}
            onChange={(e) => {
              onChange(e.target.value);
              setImageError(false);
              setImageLoaded(false);
            }}
            style={{
              width: "100%",
              paddingLeft: "34px",
              fontSize: "13px",
              height: "38px",
              borderRadius: "var(--radius-sm)",
              border: imageError ? "1.5px solid #ef4444" : "1px solid var(--border-default)"
            }}
          />
          <Globe
            size={15}
            color="var(--text-muted)"
            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
          />
        </div>
        {imageUrl && (
          <button
            type="button"
            className="icon-btn"
            title="Clear photo"
            onClick={handleClear}
            style={{ color: "#dc2626", height: "38px", width: "38px", flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Image Preview Box when URL entered */}
      {imageUrl && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 12px",
            background: "var(--bg-surface)",
            borderRadius: "8px",
            border: imageError ? "1.5px solid #fecaca" : "1px solid var(--border-default)"
          }}
        >
          <div style={{ position: "relative", width: "52px", height: "52px", flexShrink: 0 }}>
            <img
              src={imageUrl}
              alt="Web preview"
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "8px",
                objectFit: "cover",
                border: "1px solid var(--border-default)",
                display: imageError ? "none" : "block"
              }}
              onLoad={() => {
                setImageLoaded(true);
                setImageError(false);
              }}
              onError={() => {
                setImageError(true);
                setImageLoaded(false);
              }}
            />
            {imageError && (
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "8px",
                  background: "#fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#dc2626",
                  border: "1px solid #fecaca"
                }}
              >
                <AlertTriangle size={20} />
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {!imageError ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#16a34a",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px"
                    }}
                  >
                    <CheckCircle2 size={12} /> Image Ready
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>• Photo is optional</span>
                </div>
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginTop: "2px"
                  }}
                  title={imageUrl}
                >
                  {imageUrl}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#dc2626" }}>
                  Could not load image from this URL
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Please check the URL or select a web photo below.
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="secondary-btn"
            style={{
              fontSize: "11.5px",
              padding: "4px 9px",
              color: "#dc2626",
              borderColor: "#fca5a5",
              flexShrink: 0
            }}
            onClick={handleClear}
          >
            Remove Photo
          </button>
        </div>
      )}

      {/* Preset Web Photos Selector */}
      {showPresets && (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: "8px",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Popular Web Food Photos:
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Click any photo to attach
            </span>
          </div>

          {/* Category Tabs */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
            {WEB_FOOD_PRESETS.map((cat) => (
              <button
                key={cat.category}
                type="button"
                style={{
                  padding: "4px 9px",
                  fontSize: "11px",
                  borderRadius: "14px",
                  border: presetCategory === cat.category ? "1.5px solid var(--primary-600)" : "1px solid var(--border-default)",
                  background: presetCategory === cat.category ? "var(--primary-50, #f0fdf4)" : "var(--bg-surface)",
                  color: presetCategory === cat.category ? "var(--primary-700)" : "var(--text-secondary)",
                  fontWeight: presetCategory === cat.category ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
                onClick={() => setPresetCategory(cat.category)}
              >
                {cat.category}
              </button>
            ))}
          </div>

          {/* Photos Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(95px, 1fr))",
              gap: "8px",
              maxHeight: "170px",
              overflowY: "auto"
            }}
          >
            {(WEB_FOOD_PRESETS.find((c) => c.category === presetCategory)?.items || []).map((preset) => (
              <button
                key={preset.name}
                type="button"
                title={`Select ${preset.name}`}
                style={{
                  border: imageUrl === preset.url ? "2px solid var(--primary-600)" : "1px solid var(--border-default)",
                  borderRadius: "6px",
                  padding: "4px",
                  background: imageUrl === preset.url ? "var(--primary-50, #f0fdf4)" : "var(--bg-surface-subtle)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  textAlign: "center"
                }}
                onClick={() => handleSelectPreset(preset.url)}
              >
                <img
                  src={preset.url}
                  alt={preset.name}
                  style={{
                    width: "100%",
                    height: "54px",
                    borderRadius: "4px",
                    objectFit: "cover"
                  }}
                />
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    lineHeight: 1.15,
                    maxHeight: "22px",
                    overflow: "hidden"
                  }}
                >
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
