import sys
from pathlib import Path

# Add project root to Python path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from vision.inference import predict


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python vision/predict_image.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]

    print("🌾 KrishiRakshak AI — Image Prediction")
    print("--------------------------------------")
    print(f"Image: {image_path}")
    print()

    try:
        result = predict(image_path)

        print()
        print("✅ Prediction completed")
        print("--------------------------------------")
        print(f"Disease    : {result['disease']}")
        print(f"Class      : {result['class']}")
        print(f"Confidence : {result['confidence']:.2f}%")
        print("--------------------------------------")

    except Exception as error:
        print()
        print("❌ Prediction failed")
        print("--------------------------------------")
        print(error)
        sys.exit(1)
