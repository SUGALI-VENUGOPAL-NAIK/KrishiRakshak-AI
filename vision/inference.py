from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort


BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = (
    BASE_DIR
    / "models"
    / "rice_disease_resnet50.onnx"
)


# Exact class mapping from the model
CLASS_NAMES = {
    0: "Bacterial Leaf Blight",
    1: "Brown Spot",
    2: "Leaf Blast",
    3: "Tungro",
}


# ImageNet normalization
MEAN = np.array(
    [0.485, 0.456, 0.406],
    dtype=np.float32,
)

STD = np.array(
    [0.229, 0.224, 0.225],
    dtype=np.float32,
)


def load_model():
    session = ort.InferenceSession(
        str(MODEL_PATH),
        providers=["CPUExecutionProvider"],
    )

    return session


def preprocess_image(image_path):
    image = cv2.imread(str(image_path))

    if image is None:
        raise FileNotFoundError(
            f"Could not read image: {image_path}"
        )

    # OpenCV BGR -> RGB
    image = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2RGB,
    )

    # Model expects 224 x 224
    image = cv2.resize(
        image,
        (224, 224),
        interpolation=cv2.INTER_AREA,
    )

    # uint8 -> float32 [0,1]
    image = image.astype(
        np.float32
    ) / 255.0

    # ImageNet normalization
    image = (
        image - MEAN
    ) / STD

   

    # Add batch dimension
    image = np.expand_dims(
        image,
        axis=0,
    )

    return image.astype(
        np.float32
    )


def softmax(scores):
    scores = np.asarray(
        scores,
        dtype=np.float32,
    )

    scores = (
        scores
        - np.max(scores)
    )

    exp_scores = np.exp(scores)

    return (
        exp_scores
        / np.sum(exp_scores)
    )


def predict(image_path):
    session = load_model()

    input_info = (
        session.get_inputs()[0]
    )

    output_info = (
        session.get_outputs()[0]
    )

    image = preprocess_image(
        image_path
    )

    print("Input name :", input_info.name)
    print(
        "Output name:",
        output_info.name,
    )
    print(
        "Input shape:",
        image.shape,
    )

    result = session.run(
        [output_info.name],
        {
            input_info.name: image
        },
    )

    raw_output = np.asarray(
        result[0]
    )

    print("\nRaw output:")
    print(raw_output)

    scores = raw_output[0]

    probabilities = softmax(
        scores
    )

    print(
        "\nClass probabilities:"
    )

    for index, probability in enumerate(
        probabilities
    ):
        disease = CLASS_NAMES.get(
            index,
            f"Unknown Class {index}",
        )

        print(
            f"Class {index}: "
            f"{disease} — "
            f"{probability * 100:.2f}%"
        )

    predicted_class = int(
        np.argmax(probabilities)
    )

    confidence = float(
        probabilities[
            predicted_class
        ] * 100
    )

    disease = CLASS_NAMES.get(
        predicted_class,
        "Unknown Disease",
    )

    print(
        "\nPrediction"
    )

    print(
        "--------------------------------"
    )

    print(
        "Disease   :",
        disease,
    )

    print(
        "Class     :",
        predicted_class,
    )

    print(
        "Confidence:",
        f"{confidence:.2f}%",
    )

    print(
        "--------------------------------"
    )

    return {
        "disease": disease,
        "class": predicted_class,
        "confidence": confidence,
        "probabilities": probabilities,
    }


if __name__ == "__main__":

    print(
        "🌾 KrishiRakshak AI Vision Engine"
    )

    print(
        "--------------------------------"
    )

    print(
        "Model:",
        MODEL_PATH,
    )

    if not MODEL_PATH.exists():

        print(
            "❌ Model file not found"
        )

        raise SystemExit(1)

    print(
        "✅ Model file found"
    )

    session = load_model()

    print(
        "ONNX Runtime:",
        ort.__version__,
    )

    print(
        "Providers:",
        session.get_providers(),
    )

    print(
        "Input:",
        session.get_inputs()[0].name,
        session.get_inputs()[0].shape,
    )

    print(
        "Output:",
        session.get_outputs()[0].name,
        session.get_outputs()[0].shape,
    )

    print(
        "--------------------------------"
    )

    print(
        "Testing rice.jpeg..."
    )

    test_image = (
        Path.home()
        / "Pictures"
        / "rice.jpeg"
    )

    if not test_image.exists():

        print(
            "❌ Test image not found:"
        )

        print(test_image)

        raise SystemExit(1)

    predict(
        str(test_image)
    )
