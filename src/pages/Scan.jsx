import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useFridge } from "../context/useFridge";
import TiltCard from "../components/TiltCard";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";

// Initialize ZXing barcode reader configured for common retail barcode formats
const zxingHints = new Map();
zxingHints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
]);
zxingHints.set(DecodeHintType.TRY_HARDER, true);

// Unified high-performance browser barcode reader from @zxing/browser
const barcodeReader = new BrowserMultiFormatReader(zxingHints);

// Helper to map BarcodeFormat enum to friendly string
function formatToString(format) {
  switch (format) {
    case BarcodeFormat.EAN_13: return "EAN-13";
    case BarcodeFormat.EAN_8: return "EAN-8";
    case BarcodeFormat.UPC_A: return "UPC-A";
    case BarcodeFormat.UPC_E: return "UPC-E";
    case BarcodeFormat.CODE_128: return "Code 128";
    case BarcodeFormat.CODE_39: return "Code 39";
    case BarcodeFormat.CODE_93: return "Code 93";
    case BarcodeFormat.ITF: return "ITF";
    case BarcodeFormat.QR_CODE: return "QR Code";
    default: return "Barcode";
  }
}

// Native BarcodeDetector instance for ultra-fast hardware acceleration in Chrome/Edge on Windows
let nativeDetector = null;
if (typeof window !== "undefined" && "BarcodeDetector" in window) {
  try {
    if (typeof window.BarcodeDetector.getSupportedFormats === "function") {
      window.BarcodeDetector.getSupportedFormats()
        .then((supported) => {
          const wanted = [
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "code_128",
            "code_39",
            "code_93",
            "itf",
            "qr_code",
          ];
          const formats = wanted.filter((f) => supported.includes(f));
          if (formats.length > 0) {
            nativeDetector = new window.BarcodeDetector({ formats });
          }
        })
        .catch((e) => {
          console.warn("[Barcode Scanner] Supported formats query fallback:", e);
        });
    } else {
      nativeDetector = new window.BarcodeDetector({
        formats: [
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
          "code_128",
          "code_39",
          "code_93",
          "itf",
          "qr_code",
        ],
      });
    }
  } catch (e) {
    console.warn("[Barcode Scanner] Native BarcodeDetector init fallback to ZXing:", e);
  }
}

// Play supermarket-style audio confirmation beep
const playScannerBeep = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Audio blocked by browser policy until interaction
  }
};

// Offscreen reusable canvas for rotation and contrast transformations
let transformCanvas = null;

// Canvas decoder using ZXing Browser reader with multi-angle rotation & contrast options
function decodeCanvasWithZxing(canvas, rotateAngle = 0, applyContrast = false) {
  try {
    if (!canvas || canvas.width === 0 || canvas.height === 0) return null;
    let targetCanvas = canvas;

    if (rotateAngle !== 0 || applyContrast) {
      if (!transformCanvas) {
        transformCanvas = document.createElement("canvas");
      }
      const isRotated = rotateAngle === 90 || rotateAngle === 270;
      const w = isRotated ? canvas.height : canvas.width;
      const h = isRotated ? canvas.width : canvas.height;
      transformCanvas.width = w;
      transformCanvas.height = h;
      const tCtx = transformCanvas.getContext("2d", { willReadFrequently: true });
      if (!tCtx) return null;

      if (applyContrast) {
        tCtx.filter = "contrast(1.45) brightness(1.05)";
      } else {
        tCtx.filter = "none";
      }

      if (rotateAngle !== 0) {
        tCtx.translate(w / 2, h / 2);
        tCtx.rotate((rotateAngle * Math.PI) / 180);
        tCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
      } else {
        tCtx.drawImage(canvas, 0, 0);
      }
      targetCanvas = transformCanvas;
    }

    const result = barcodeReader.decodeFromCanvas(targetCanvas);
    if (result) {
      return {
        text: typeof result.getText === "function" ? result.getText() : result.text,
        format: typeof result.getBarcodeFormat === "function" ? formatToString(result.getBarcodeFormat()) : "Barcode",
      };
    }
  } catch {
    // NotFoundException is expected on video frames without a detectable barcode
  }
  return null;
}

// Mock Product Database for instant barcode lookups
const PRODUCT_DATABASE = {
  "8901234567890": {
    barcode: "8901234567890",
    name: "Milma Fresh Cow Milk",
    brand: "Milma",
    category: "Dairy",
    quantity: "1 L",
    icon: "🥛",
    nutrition: "65 kcal / 100ml | 3.2g Protein | 4.5g Carbs",
    defaultExpiryDays: 4,
  },
  "8901122334455": {
    barcode: "8901122334455",
    name: "Artisan Sourdough Bread",
    brand: "Daily Bake",
    category: "Bakery",
    quantity: "400 g",
    icon: "🍞",
    nutrition: "240 kcal / 100g | 8g Protein | 48g Carbs",
    defaultExpiryDays: 3,
  },
  "8902233445566": {
    barcode: "8902233445566",
    name: "Farm Fresh Free-Range Eggs",
    brand: "Happy Farms",
    category: "Dairy",
    quantity: "6 pcs",
    icon: "🥚",
    nutrition: "72 kcal / egg | 6.3g Protein | 0.4g Carbs",
    defaultExpiryDays: 14,
  },
  "8903344556677": {
    barcode: "8903344556677",
    name: "Organic Vine Tomatoes",
    brand: "Fresh Direct",
    category: "Produce",
    quantity: "500 g",
    icon: "🍅",
    nutrition: "18 kcal / 100g | Rich in Vitamin C & Lycopene",
    defaultExpiryDays: 5,
  },
  "8904455667788": {
    barcode: "8904455667788",
    name: "Boneless Chicken Breast",
    brand: "Prime Cuts",
    category: "Meat",
    quantity: "500 g",
    icon: "🍗",
    nutrition: "165 kcal / 100g | 31g Protein | 3.6g Fat",
    defaultExpiryDays: 4,
  },
  "8905566778899": {
    barcode: "8905566778899",
    name: "Durum Wheat Penne Pasta",
    brand: "Barilla",
    category: "Pantry",
    quantity: "500 g",
    icon: "🍝",
    nutrition: "350 kcal / 100g | 12g Protein | 71g Carbs",
    defaultExpiryDays: 180,
  },
  "8907788990011": {
    barcode: "8907788990011",
    name: "Aged Cheddar Cheese",
    brand: "Amul",
    category: "Dairy",
    quantity: "200 g",
    icon: "🧀",
    nutrition: "402 kcal / 100g | 25g Protein | High Calcium",
    defaultExpiryDays: 20,
  },
  "8908899001122": {
    barcode: "8908899001122",
    name: "Hass Avocado",
    brand: "Nature's Basket",
    category: "Produce",
    quantity: "2 pcs",
    icon: "🥑",
    nutrition: "160 kcal / 100g | Healthy Monounsaturated Fats",
    defaultExpiryDays: 4,
  },
};

// Map Open Food Facts category tags to Smart Fridge categories
function mapCategory(categoriesTags = [], productName = "") {
  const combined = (categoriesTags.join(" ") + " " + productName).toLowerCase();
  if (/dairy|milk|cheese|yogurt|butter|cream|paneer|curd|fromage|lait/.test(combined)) return "Dairy";
  if (/produce|fruit|vegetable|salad|tomato|onion|potato|apple|banana|berry|citrus/.test(combined)) return "Produce";
  if (/bakery|bread|biscuit|cake|pastry|cookie|toast|croissant|flour/.test(combined)) return "Bakery";
  if (/meat|chicken|beef|pork|fish|poultry|seafood|salmon|ham|sausage/.test(combined)) return "Meat";
  return "Pantry"; // Default grocery category
}

// Select suitable emoji for food
function getFoodEmoji(name = "", category = "Pantry") {
  const n = (name || "").toLowerCase();
  if (/milk/.test(n)) return "🥛";
  if (/cheese/.test(n)) return "🧀";
  if (/yogurt|curd/.test(n)) return "🥣";
  if (/bread|toast|bagel/.test(n)) return "🍞";
  if (/egg/.test(n)) return "🥚";
  if (/tomato/.test(n)) return "🍅";
  if (/apple/.test(n)) return "🍎";
  if (/banana/.test(n)) return "🍌";
  if (/chicken/.test(n)) return "🍗";
  if (/meat|beef|steak/.test(n)) return "🥩";
  if (/fish|salmon|tuna/.test(n)) return "🐟";
  if (/pasta|spaghetti|macaroni|noodle/.test(n)) return "🍝";
  if (/rice/.test(n)) return "🍚";
  if (/chocolate|candy|sweet|nutella/.test(n)) return "🍫";
  if (/cookie|biscuit/.test(n)) return "🍪";
  if (/chips|crisps|snack/.test(n)) return "🥔";
  if (/soda|cola|coke|beverage|drink|juice/.test(n)) return "🥤";
  if (/water/.test(n)) return "💧";
  if (/coffee|tea/.test(n)) return "☕";
  if (/sauce|ketchup|mustard|mayo/.test(n)) return "🥫";
  if (/oil/.test(n)) return "🫒";
  if (category === "Dairy") return "🥛";
  if (category === "Produce") return "🥦";
  if (category === "Bakery") return "🥐";
  if (category === "Meat") return "🥩";
  return "📦";
}

// Query real product details from Open Food Facts API (3M+ items worldwide)
async function fetchProductFromOpenFoodFacts(barcode) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 1 && data.product) {
      const p = data.product;
      const rawName = p.product_name || p.product_name_en || p.generic_name;
      if (!rawName || !rawName.trim()) return null;

      const name = rawName.trim();
      const brand = p.brands ? p.brands.split(",")[0].trim() : "Retail Grocery";
      const category = mapCategory(p.categories_tags || [], name);
      const icon = getFoodEmoji(name, category);
      const quantity = p.quantity ? p.quantity.trim() : "1 unit";
      const kcal = p.nutriments?.energy_kcal || p.nutriments?.["energy-kcal_100g"];
      const protein = p.nutriments?.proteins_100g ?? p.nutriments?.proteins;
      const carbs = p.nutriments?.carbohydrates_100g ?? p.nutriments?.carbohydrates;
      const nutritionParts = [];
      if (kcal !== undefined && kcal !== null) nutritionParts.push(`${kcal} kcal`);
      if (protein !== undefined && protein !== null) nutritionParts.push(`${protein}g Protein`);
      if (carbs !== undefined && carbs !== null) nutritionParts.push(`${carbs}g Carbs`);
      const nutrition = nutritionParts.length > 0
        ? `${nutritionParts.join(" | ")} (per 100g)`
        : "Standard retail packaging specifications";

      const defaultExpiryDays = category === "Dairy" ? 6 : category === "Bakery" ? 4 : category === "Produce" ? 5 : category === "Meat" ? 3 : 90;

      return {
        barcode,
        name,
        brand,
        category,
        quantity,
        icon,
        nutrition,
        defaultExpiryDays,
        isRealFoodProduct: true,
      };
    }
  } catch (err) {
    console.warn("[Barcode Scanner] Open Food Facts lookup warning:", err);
  }
  return null;
}

export default function Scan() {
  const navigate = useNavigate();
  const { addItemToFridge, showToast } = useFridge();

  // Mode Selection: 'webcam' | 'manual' | 'esp32'
  const [scanMode, setScanMode] = useState("webcam");

  // ESP32-CAM Configuration & State
  const [esp32Ip, setEsp32Ip] = useState(() => {
    return localStorage.getItem("smart_fridge_esp32_ip") || "http://192.168.1.50";
  });
  const [esp32Status, setEsp32Status] = useState("standby"); // 'standby' | 'testing' | 'online' | 'offline'
  const [esp32Flash, setEsp32Flash] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const [streamError, setStreamError] = useState(false);
  const [showWiringGuide, setShowWiringGuide] = useState(false);

  // Manual & Product Selection
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [isScanning] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);

  // Laptop Webcam Scanner State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [detectedBarcode, setDetectedBarcode] = useState("");
  const [detectedFormat, setDetectedFormat] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanCanvasRef = useRef(null);
  const roiCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastScannedRef = useRef({ code: "", time: 0 });

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startWebcam = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      let stream;
      try {
        // First try standard laptop camera constraints (user-facing, 720p)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: { ideal: "user" },
          },
          audio: false,
        });
      } catch {
        // Fallback for laptop cameras that do not support specific constraint sets
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);
      setCameraActive(true);
    } catch (err) {
      console.warn("[Barcode Scanner] Webcam access error:", err);
      setCameraActive(false);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera permissions in your browser to scan barcodes."
          : "Laptop webcam not detected or currently in use by another application."
      );
    }
  }, []);

  // Manage webcam lifecycle when entering or leaving webcam mode
  useEffect(() => {
    if (scanMode !== "webcam") {
      return;
    }

    let isCancelled = false;

    const initWebcamStream = async () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: { ideal: "user" },
            },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraError(null);
        setCameraActive(true);
      } catch (err) {
        if (!isCancelled) {
          console.warn("[Barcode Scanner] Webcam init error:", err);
          setCameraActive(false);
          setCameraError(
            err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
              ? "Camera permission denied. Please allow camera permissions in your browser to scan barcodes."
              : "Laptop webcam not detected or currently in use by another application."
          );
        }
      }
    };

    const videoNode = videoRef.current;
    initWebcamStream();

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoNode) {
        videoNode.srcObject = null;
      }
      setCameraActive(false);
    };
  }, [scanMode]);

  // Ensure video element receives stream once mounted
  useEffect(() => {
    if (videoRef.current && streamRef.current && cameraActive) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  // Quick date helper
  const getOffsetDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const handleProductSelect = useCallback((product) => {
    setSelectedProduct(product);
    setExpiryDate(getOffsetDate(product.defaultExpiryDays || 7));
  }, []);

  const resolveAndSelectProduct = useCallback(
    async (cleanBarcode) => {
      if (!cleanBarcode) return;

      // 1. Check local database cache
      const existing = PRODUCT_DATABASE[cleanBarcode];
      if (existing) {
        handleProductSelect(existing);
        return;
      }

      // 2. Fetch real food product from Open Food Facts
      showToast(`Searching Open Food Facts for ${cleanBarcode}...`, "🔍");
      const realProduct = await fetchProductFromOpenFoodFacts(cleanBarcode);
      if (realProduct) {
        PRODUCT_DATABASE[cleanBarcode] = realProduct; // Cache for instant subsequent queries
        showToast(`Identified: ${realProduct.name} (${realProduct.brand})`, "✅");
        handleProductSelect(realProduct);
        return;
      }

      // 3. Fallback for unlisted items
      const customItem = {
        barcode: cleanBarcode,
        name: `Grocery Item (${cleanBarcode.slice(-4)})`,
        brand: "Custom Grocery",
        category: "Pantry",
        quantity: "1 unit",
        icon: "📦",
        nutrition: "Standard grocery package - review details before saving",
        defaultExpiryDays: 7,
        isRealFoodProduct: false,
      };
      PRODUCT_DATABASE[cleanBarcode] = customItem;
      handleProductSelect(customItem);
    },
    [handleProductSelect, showToast]
  );

  const handleBarcodeSearch = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    await resolveAndSelectProduct(barcodeInput.trim());
  };

  const handleConfirmAddToFridge = () => {
    if (!selectedProduct) return;

    addItemToFridge({
      barcode: selectedProduct.barcode,
      name: selectedProduct.name,
      brand: selectedProduct.brand,
      category: selectedProduct.category,
      quantity: selectedProduct.quantity,
      icon: selectedProduct.icon,
      nutrition: selectedProduct.nutrition,
      expiryDate: expiryDate || getOffsetDate(7),
    });

    setSelectedProduct(null);
    setBarcodeInput("");
  };

  // Decode a single video frame with Native BarcodeDetector + Multi-Pass ZXing
  const scanVideoFrame = useCallback(async (video) => {
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;

    // 1. Primary: Native hardware-accelerated BarcodeDetector (Chrome/Edge on Windows)
    if (nativeDetector) {
      try {
        const barcodes = await nativeDetector.detect(video);
        if (barcodes && barcodes.length > 0) {
          const first = barcodes[0];
          return {
            text: first.rawValue,
            format: first.format ? first.format.toUpperCase().replace("_", "-") : "BARCODE",
          };
        }
      } catch {
        // Fall through to ZXing
      }
    }

    // 2. Secondary: ZXing Multi-Format Reader with Multi-Pass (ROI, 90-degree rotate, contrast)
    if (!scanCanvasRef.current) {
      scanCanvasRef.current = document.createElement("canvas");
    }
    const canvas = scanCanvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    const targetWidth = Math.min(video.videoWidth || 1280, 1280);
    const scale = targetWidth / (video.videoWidth || targetWidth);
    const targetHeight = Math.round((video.videoHeight || 720) * scale);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    // Prepare Central Region Of Interest (HUD Box)
    if (!roiCanvasRef.current) {
      roiCanvasRef.current = document.createElement("canvas");
    }
    const roiCanvas = roiCanvasRef.current;
    const cropW = Math.round(targetWidth * 0.75);
    const cropH = Math.round(targetHeight * 0.65);
    const cropX = Math.round((targetWidth - cropW) / 2);
    const cropY = Math.round((targetHeight - cropH) / 2);

    if (roiCanvas.width !== cropW || roiCanvas.height !== cropH) {
      roiCanvas.width = cropW;
      roiCanvas.height = cropH;
    }
    const roiCtx = roiCanvas.getContext("2d", { willReadFrequently: true });
    if (roiCtx) {
      roiCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      // Pass 1: Center ROI Horizontal (Standard)
      let detected = decodeCanvasWithZxing(roiCanvas);
      if (detected) return detected;

      // Pass 2: Center ROI Rotated 90° (Crucial for vertical barcodes on bottles/boxes)
      detected = decodeCanvasWithZxing(roiCanvas, 90);
      if (detected) return detected;

      // Pass 3: Center ROI with Contrast Boost (Crucial for webcams with glare or soft lighting)
      detected = decodeCanvasWithZxing(roiCanvas, 0, true);
      if (detected) return detected;
    }

    // Pass 4: Full Frame Horizontal
    let fullDetected = decodeCanvasWithZxing(canvas);
    if (fullDetected) return fullDetected;

    // Pass 5: Full Frame Rotated 90°
    fullDetected = decodeCanvasWithZxing(canvas, 90);
    return fullDetected;
  }, []);

  // Handle successful barcode recognition
  const handleBarcodeDetected = useCallback(
    (barcodeText, format = "") => {
      if (!barcodeText) return;
      const cleanBarcode = barcodeText.trim();
      if (!cleanBarcode) return;

      // Cooldown to avoid re-triggering the same barcode multiple times within 2.5s
      const now = Date.now();
      if (cleanBarcode === lastScannedRef.current.code && now - lastScannedRef.current.time < 2500) {
        return;
      }
      lastScannedRef.current = { code: cleanBarcode, time: now };

      playScannerBeep();
      setDetectedBarcode(cleanBarcode);
      setDetectedFormat(format || "Standard Barcode");
      setBarcodeInput(cleanBarcode);
      showToast(`Detected Barcode: ${cleanBarcode} (${format || "Barcode"})`, "📦");
      resolveAndSelectProduct(cleanBarcode);
    },
    [showToast, resolveAndSelectProduct]
  );

  // Real-time video frame scanning loop
  useEffect(() => {
    if (scanMode !== "webcam" || !cameraActive) return;

    let isMounted = true;
    let isProcessing = false;

    const intervalId = setInterval(async () => {
      if (!isMounted || isProcessing) return;
      if (selectedProduct) return; // Pause scanning while confirmation modal is open
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      isProcessing = true;
      try {
        const result = await scanVideoFrame(videoRef.current);
        if (result && isMounted && !selectedProduct) {
          handleBarcodeDetected(result.text, result.format);
        }
      } catch (err) {
        console.warn("[Barcode Scanner] Loop decode error:", err);
      } finally {
        isProcessing = false;
      }
    }, 180);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [scanMode, cameraActive, selectedProduct, scanVideoFrame, handleBarcodeDetected]);

  // Manual snapshot capture trigger for webcam
  const triggerWebcamManualScan = async () => {
    if (!cameraActive || !videoRef.current) {
      showToast("Please start the webcam first.", "⚠️");
      return;
    }
    setIsCapturing(true);
    try {
      showToast("Analyzing frame with multi-angle scan...", "📷");
      const result = await scanVideoFrame(videoRef.current);
      if (result) {
        handleBarcodeDetected(result.text, result.format);
      } else {
        showToast("No barcode detected. Hold 15–25 cm away and keep steady.", "⚠️");
      }
    } catch (err) {
      console.error("[Barcode Scanner] Manual frame scan error:", err);
      showToast("Scan attempt failed. Adjust lighting and try again.", "❌");
    } finally {
      setIsCapturing(false);
    }
  };

  // Upload photo of barcode fallback
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);
    showToast("Scanning uploaded image for barcode...", "🔍");

    const objectUrl = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = objectUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = img.naturalWidth || img.width;
      tempCanvas.height = img.naturalHeight || img.height;
      const tCtx = tempCanvas.getContext("2d");
      if (tCtx) {
        tCtx.drawImage(img, 0, 0);
      }

      let detected = decodeCanvasWithZxing(tempCanvas);
      if (!detected) detected = decodeCanvasWithZxing(tempCanvas, 90);
      if (!detected) detected = decodeCanvasWithZxing(tempCanvas, 0, true);

      if (detected) {
        handleBarcodeDetected(detected.text, detected.format);
      } else {
        showToast("No barcode found in image. Ensure barcode lines are sharp & clear.", "⚠️");
      }
    } catch (err) {
      console.warn("[Barcode Scanner] File decode error:", err);
      showToast("Could not decode barcode from image. Try another photo.", "⚠️");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setIsCapturing(false);
      if (e.target) e.target.value = "";
    }
  };

  // ESP32 IP Change Handler
  const handleIpChange = (val) => {
    setEsp32Ip(val);
    localStorage.setItem("smart_fridge_esp32_ip", val);
    setStreamError(false);
  };

  // Test Ping to ESP32
  const testEsp32Connection = async () => {
    setEsp32Status("testing");
    const cleanUrl = esp32Ip.replace(/\/+$/, "");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${cleanUrl}/status`, {
        signal: controller.signal,
        mode: "cors",
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setEsp32Status("online");
        setStreamError(false);
        setStreamKey((k) => k + 1);
        showToast(`ESP32-CAM is online! (RSSI: ${data.rssi || "-55"} dBm)`, "📶");
      } else {
        throw new Error("HTTP error");
      }
    } catch {
      setEsp32Status("offline");
      setStreamError(true);
      showToast("ESP32-CAM unreachable. Check Wi-Fi and IP address.", "⚠️");
    }
  };

  // Toggle ESP32 Flashlight
  const toggleEsp32Flash = async () => {
    const cleanUrl = esp32Ip.replace(/\/+$/, "");
    const nextState = !esp32Flash;
    try {
      await fetch(`${cleanUrl}/flash?state=${nextState ? 1 : 0}`, { mode: "cors" });
      setEsp32Flash(nextState);
      showToast(nextState ? "ESP32 Flashlight ON" : "ESP32 Flashlight OFF", "💡");
    } catch {
      // Local fallback toggle for visual feedback
      setEsp32Flash(nextState);
      showToast(nextState ? "Simulated Flashlight ON" : "Simulated Flashlight OFF", "💡");
    }
  };

  // Trigger Real Capture & Barcode Decode from ESP32-CAM
  const triggerEsp32Capture = async () => {
    if (isCapturing) return;

    if (!esp32Ip || !esp32Ip.trim()) {
      showToast("Please provide a valid ESP32-CAM IP address.", "⚠️");
      return;
    }

    const cleanEsp32Url = esp32Ip.trim().replace(/\/+$/, "");
    setIsCapturing(true);

    try {
      showToast("Capturing image from ESP32-CAM...", "📷");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${cleanEsp32Url}/capture`, {
        signal: controller.signal,
        mode: "cors",
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`ESP32 capture returned HTTP ${res.status}`);
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        throw new Error("Received empty image payload from ESP32-CAM");
      }

      let decodedText = null;
      const objectUrl = URL.createObjectURL(blob);
      try {
        const result = await barcodeReader.decodeFromImageUrl(objectUrl);
        if (result) {
          decodedText = typeof result.getText === "function" ? result.getText() : result.text;
        }
      } catch (decodeErr) {
        console.warn("[Barcode Scanner] No barcode detected in frame:", decodeErr);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }

      if (!decodedText) {
        showToast("No barcode detected. Ensure barcode is clear and in frame.", "⚠️");
        return;
      }

      console.log(`[Barcode Scanner] Detected barcode: ${decodedText}`);
      showToast(`Detected barcode: ${decodedText}`, "📦");
      await resolveAndSelectProduct(decodedText);
    } catch (err) {
      console.error("[Barcode Scanner] ESP32 capture failed:", err);
      showToast("Failed to capture image from ESP32-CAM.", "❌");
    } finally {
      setIsCapturing(false);
    }
  };

  const cleanEsp32Url = esp32Ip.replace(/\/+$/, "");
  const streamUrl = `${cleanEsp32Url}/stream?key=${streamKey}`;

  return (
    <div className="scan-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-badge">
          <span>📷</span> Optical Barcode Recognition
        </div>
        <h1>Scan Product</h1>
        <p>
          Connect your physical ESP32-CAM or use your webcam to scan grocery barcodes and track shelf-life automatically.
        </p>

        {/* Hardware Mode Selector */}
        <div className="scan-mode-tabs">
          <button
            type="button"
            className={`scan-mode-btn ${scanMode === "webcam" ? "active" : ""}`}
            onClick={() => {
              setScanMode("webcam");
              if (!cameraActive) startWebcam();
            }}
          >
            <span>🎥</span> Laptop Webcam
          </button>
          <button
            type="button"
            className={`scan-mode-btn ${scanMode === "manual" ? "active" : ""}`}
            onClick={() => {
              setScanMode("manual");
              stopWebcam();
            }}
          >
            <span>⌨️</span> Manual Barcode
          </button>
          <button
            type="button"
            className={`scan-mode-btn ${scanMode === "esp32" ? "active" : ""}`}
            onClick={() => {
              setScanMode("esp32");
              stopWebcam();
            }}
          >
            <span>📶</span> ESP32-CAM Wi-Fi
          </button>
        </div>
      </div>

      {/* ESP32 Hardware Config Bar (Visible in ESP32 Mode) */}
      {scanMode === "esp32" && (
        <div className="esp32-config-bar">
          <div className="esp32-config-left">
            <span className="esp32-label">ESP32 IP:</span>
            <input
              type="text"
              className="esp32-ip-input"
              value={esp32Ip}
              placeholder="e.g. http://192.168.1.50"
              onChange={(e) => handleIpChange(e.target.value)}
            />
            <button
              type="button"
              className="esp32-ping-btn"
              onClick={testEsp32Connection}
              disabled={esp32Status === "testing"}
            >
              {esp32Status === "testing" ? "Testing..." : "⚡ Test Ping"}
            </button>
          </div>

          <div className="esp32-config-right">
            <span className={`esp32-status-pill ${esp32Status}`}>
              <span className="pulse-dot" />
              {esp32Status === "online"
                ? "ESP32 Online"
                : esp32Status === "offline"
                ? "ESP32 Offline"
                : "Standby"}
            </span>

            <button
              type="button"
              className={`esp32-flash-btn ${esp32Flash ? "active" : ""}`}
              onClick={toggleEsp32Flash}
              title="Toggle Flash LED"
            >
              💡 {esp32Flash ? "Flash ON" : "Flash OFF"}
            </button>

            <button
              type="button"
              className="esp32-guide-btn"
              onClick={() => setShowWiringGuide(true)}
            >
              📖 Wiring Guide
            </button>
          </div>
        </div>
      )}

      <div className="scan-container">
        {/* Left: Viewfinder & Camera HUD */}
        <TiltCard className="scanner-viewfinder-card">
          <div className="scanner-hud-wrapper">
            {scanMode === "webcam" && cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="scanner-video-feed"
                onLoadedMetadata={(e) => {
                  e.target.muted = true;
                  e.target.play().catch(() => {});
                }}
              />
            ) : scanMode === "esp32" && !streamError ? (
              <img
                src={streamUrl}
                alt="ESP32-CAM Live Feed"
                className="scanner-video-feed"
                onError={() => setStreamError(true)}
              />
            ) : (
              <div className="scanner-mock-stream">
                <div style={{ fontSize: "56px", marginBottom: "8px" }}>
                  {scanMode === "webcam" ? "🎥" : "📦"}
                </div>
                <span style={{ fontWeight: 600, color: "#e2e8f0" }}>
                  {scanMode === "webcam"
                    ? cameraError ? "Webcam Access Needed" : "Laptop Webcam Ready"
                    : scanMode === "esp32" ? "ESP32-CAM Ready to Stream" : "Camera Stream Ready"}
                </span>
                <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", textAlign: "center", maxWidth: "80%" }}>
                  {scanMode === "webcam"
                    ? (cameraError || "Click 'Start Camera' below or grant camera permissions to scan retail barcodes.")
                    : scanMode === "esp32"
                    ? `Listening on ${esp32Ip} (OV2640 Sensor)`
                    : "Standard WebRTC Video Capture"}
                </span>
                {scanMode === "webcam" && !cameraActive && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ marginTop: "14px", padding: "8px 20px", flex: "none" }}
                    onClick={startWebcam}
                  >
                    <span>🎥</span> Start Camera
                  </button>
                )}
                {scanMode === "esp32" && streamError && (
                  <div className="stream-offline-notice">
                    <span>⚠️ No stream detected at {esp32Ip}</span>
                    <button
                      type="button"
                      className="stream-retry-btn"
                      onClick={() => {
                        setStreamError(false);
                        setStreamKey((k) => k + 1);
                      }}
                    >
                      Retry Stream
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Target HUD Box */}
            <div className="scanner-hud-box">
              <div className="hud-corner hud-top-left" />
              <div className="hud-corner hud-top-right" />
              <div className="hud-corner hud-bottom-left" />
              <div className="hud-corner hud-bottom-right" />
              {isScanning && <div className="scanner-laser-line" />}
            </div>

            {/* Live Detected Barcode HUD Pill */}
            {detectedBarcode && (
              <div className="scanner-hud-detected-pill">
                <span className="pulse-dot-green" />
                <span>Detected: <strong>{detectedBarcode}</strong></span>
                {detectedFormat && <span className="hud-fmt-tag">{detectedFormat}</span>}
              </div>
            )}

            {/* HUD Status Bar */}
            <div className="scanner-hud-info">
              <span>
                {scanMode === "webcam"
                  ? "Laptop Webcam Scanner (Auto-Detect)"
                  : scanMode === "esp32"
                  ? "ESP32-CAM AI Thinker (Wi-Fi)"
                  : "Manual Lookup Mode"}
              </span>
              <span style={{ color: "#22c55e", fontWeight: 700 }}>
                {scanMode === "webcam" && cameraActive ? "● LIVE SCANNING" : "● READY"}
              </span>
            </div>
          </div>

          {/* Quick Barcode Scanning Tips for Webcam */}
          {scanMode === "webcam" && cameraActive && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                margin: "10px 0 6px",
                background: "rgba(238, 242, 255, 0.75)",
                border: "1px solid rgba(199, 210, 254, 0.8)",
                borderRadius: "12px",
                fontSize: "12px",
                color: "#3730a3",
              }}
            >
              <span>💡</span>
              <span>
                <strong>Scanning Tip:</strong> Hold barcode <strong>15–25 cm (6–10 in)</strong> away from camera so stripes are sharp. If barcode is vertical, rotate package 90°.
              </span>
            </div>
          )}

          {/* Dedicated Barcode Number Readout Strip */}
          {detectedBarcode && (
            <div className="detected-barcode-banner">
              <div className="detected-barcode-left">
                <span className="barcode-badge-icon">🏷️</span>
                <div>
                  <div className="detected-barcode-title">Detected Barcode Number</div>
                  <div className="detected-barcode-digits">{detectedBarcode}</div>
                </div>
              </div>
              <div className="detected-barcode-actions">
                {detectedFormat && <span className="badge-pill format-pill">{detectedFormat}</span>}
                <button
                  type="button"
                  className="btn-reselect"
                  onClick={() => resolveAndSelectProduct(detectedBarcode)}
                >
                  View Item →
                </button>
              </div>
            </div>
          )}

          <div className="scanner-controls">
            {scanMode === "esp32" ? (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={triggerEsp32Capture}
                  disabled={isCapturing}
                >
                  <span>⚡</span> {isCapturing ? "Scanning..." : "Capture / Scan Barcode"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setStreamError(false);
                    setStreamKey((k) => k + 1);
                    testEsp32Connection();
                  }}
                >
                  <span>🔄</span> Refresh Stream
                </button>
              </>
            ) : scanMode === "webcam" ? (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={triggerWebcamManualScan}
                  disabled={isCapturing || !cameraActive}
                >
                  <span>⚡</span> {isCapturing ? "Analyzing Frame..." : "Capture / Scan Barcode"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    if (cameraActive) {
                      stopWebcam();
                    } else {
                      startWebcam();
                    }
                  }}
                >
                  <span>{cameraActive ? "🛑" : "🎥"}</span>
                  {cameraActive ? "Stop Camera" : "Start Camera"}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload a photo of a barcode from your computer"
                >
                  <span>📁</span> Upload Photo
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleProductSelect(PRODUCT_DATABASE["8902233445566"])}
              >
                <span>🎲</span> Load Demo Product
              </button>
            )}
          </div>
        </TiltCard>

        {/* Right: Manual Barcode & Quick Preset Demos */}
        <TiltCard className="scan-manual-card">
          <h2 className="scan-card-title">
            <span>⌨️</span> Manual Barcode Lookup
          </h2>

          <form onSubmit={handleBarcodeSearch} className="barcode-input-group">
            <input
              type="text"
              placeholder="e.g. 8901234567890"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="input-glass"
            />
            <button type="submit" className="btn-primary" style={{ flex: "none", padding: "12px 20px" }}>
              Search
            </button>
          </form>

          <h2 className="scan-card-title" style={{ marginTop: "12px" }}>
            <span>⚡</span> Quick Barcode Test Presets
          </h2>
          <p style={{ fontSize: "13px", color: "var(--color-text-light)", margin: "-8px 0 14px" }}>
            Click any item below to simulate instant ESP32-CAM identification:
          </p>

          <div className="preset-chip-list">
            {Object.values(PRODUCT_DATABASE).slice(0, 5).map((item) => (
              <button
                type="button"
                key={item.barcode}
                className="preset-chip"
                onClick={() => handleProductSelect(item)}
                aria-label={`Select ${item.name}`}
              >
                <div className="preset-chip-left">
                  <span className="preset-chip-icon">{item.icon}</span>
                  <div>
                    <div className="preset-chip-name">{item.name}</div>
                    <div className="preset-chip-barcode">{item.barcode}</div>
                  </div>
                </div>
                <span className="badge-pill category">{item.category}</span>
              </button>
            ))}
          </div>
        </TiltCard>
      </div>

      {/* Product Confirmation Modal */}
      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div
            className="product-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setSelectedProduct(null)}
            >
              ✕
            </button>

            <div className="modal-product-header">
              <div className="modal-product-icon">{selectedProduct.icon}</div>
              <div className="modal-product-titles" style={{ flex: 1, minWidth: 0 }}>
                <input
                  type="text"
                  className="modal-title-input"
                  value={selectedProduct.name}
                  onChange={(e) => setSelectedProduct((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Food item name"
                  title="Click to edit item name"
                />
                <div className="modal-product-badge-row" style={{ flexWrap: "wrap", alignItems: "center" }}>
                  <span className="badge-pill barcode-pill">🏷️ {selectedProduct.barcode}</span>
                  <span className="badge-pill">{selectedProduct.brand}</span>
                  <select
                    className="modal-category-select"
                    value={selectedProduct.category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setSelectedProduct((prev) => ({
                        ...prev,
                        category: newCat,
                        icon: getFoodEmoji(prev.name, newCat),
                      }));
                    }}
                    title="Change category"
                  >
                    <option value="Dairy">Dairy</option>
                    <option value="Produce">Produce</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Meat">Meat</option>
                    <option value="Pantry">Pantry</option>
                  </select>
                  <input
                    type="text"
                    className="modal-qty-input"
                    value={selectedProduct.quantity}
                    onChange={(e) => setSelectedProduct((prev) => ({ ...prev, quantity: e.target.value }))}
                    placeholder="Qty"
                    title="Package size / quantity"
                  />
                  {selectedProduct.isRealFoodProduct && (
                    <span className="badge-pill" style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", fontWeight: 700 }}>
                      🌐 Open Food Facts
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-section">
              <div className="modal-section-title">NUTRITION & SPECS</div>
              <div style={{ fontSize: "13px", color: "var(--color-text-muted)", padding: "8px 12px", background: "#f8fafc", borderRadius: "12px" }}>
                {selectedProduct.nutrition}
              </div>
            </div>

            <div className="modal-section">
              <div className="modal-section-title">
                📅 CONFIRM EXPIRY DATE (Retail Barcodes do not store batch expiry)
              </div>

              {/* Quick Offset Presets */}
              <div className="expiry-presets-row">
                <button
                  type="button"
                  className="expiry-preset-btn"
                  onClick={() => setExpiryDate(getOffsetDate(2))}
                >
                  +2 Days
                </button>
                <button
                  type="button"
                  className="expiry-preset-btn"
                  onClick={() => setExpiryDate(getOffsetDate(5))}
                >
                  +5 Days
                </button>
                <button
                  type="button"
                  className="expiry-preset-btn"
                  onClick={() => setExpiryDate(getOffsetDate(10))}
                >
                  +10 Days
                </button>
                <button
                  type="button"
                  className="expiry-preset-btn"
                  onClick={() => setExpiryDate(getOffsetDate(30))}
                >
                  +1 Month
                </button>
              </div>

              <div className="date-input-wrapper">
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="date-input-field"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmAddToFridge}
              >
                <span>🧊</span> Add to My Fridge
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  handleConfirmAddToFridge();
                  navigate("/fridge");
                }}
              >
                Add & View Fridge →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wiring & Flashing Guide Modal */}
      {showWiringGuide && (
        <div className="modal-backdrop" onClick={() => setShowWiringGuide(false)}>
          <div className="product-confirm-modal guide-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowWiringGuide(false)}
            >
              ✕
            </button>
            <h2>🔌 ESP32-CAM Hardware Setup Guide</h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
              Follow these simple steps to flash and connect your ESP32-CAM:
            </p>

            <div className="guide-table-wrapper">
              <table className="guide-table">
                <thead>
                  <tr>
                    <th>FT232RL Programmer</th>
                    <th>ESP32-CAM</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>VCC (5V)</strong></td>
                    <td>5V</td>
                    <td>Jumper set to 5V on programmer</td>
                  </tr>
                  <tr>
                    <td><strong>GND</strong></td>
                    <td>GND</td>
                    <td>Common ground</td>
                  </tr>
                  <tr>
                    <td><strong>TXD</strong></td>
                    <td>U0R (RX)</td>
                    <td>Serial receive</td>
                  </tr>
                  <tr>
                    <td><strong>RXD</strong></td>
                    <td>U0T (TX)</td>
                    <td>Serial transmit</td>
                  </tr>
                  <tr style={{ background: "#fff1f2" }}>
                    <td><em>None</em></td>
                    <td><strong>GPIO 0 ➔ GND</strong></td>
                    <td>⚠️ <strong>Hold in GND to upload!</strong> (Disconnect after flashing)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="guide-step-box">
              <strong>Step 1:</strong> Open <code>firmware/SmartFridge_ESP32CAM.ino</code> in Arduino IDE.<br />
              <strong>Step 2:</strong> Enter your Wi-Fi name & password at lines 20-21.<br />
              <strong>Step 3:</strong> Select Board <em>AI Thinker ESP32-CAM</em> & click <strong>Upload</strong>.<br />
              <strong>Step 4:</strong> Disconnect GPIO 0 from GND, press RST, and copy the IP address into the input above!
            </div>

            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowWiringGuide(false)}
              >
                Got It, Let's Scan!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
