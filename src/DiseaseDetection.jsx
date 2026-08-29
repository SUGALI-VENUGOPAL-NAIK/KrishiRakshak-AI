import { useState } from 'react'

function DiseaseDetection() {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]

    setResult(null)
    setError('')

    if (!file) {
      setImage(null)
      setPreview('')
      return
    }

    if (!file.type.startsWith('image/')) {
      setImage(null)
      setPreview('')
      setError('Please select a valid crop image.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setImage(null)
      setPreview('')
      setError('Image must be smaller than 10 MB.')
      return
    }

    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  const analyzeDisease = async () => {
    if (!image) {
      setError('Please select a crop image first.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('image', image)

      const response = await fetch(
        'http://localhost:5000/api/disease',
        {
          method: 'POST',
          body: formData,
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Disease analysis failed.'
        )
      }

      setResult(data)
    } catch (err) {
      console.error(err)

      setError(
        err.message ||
          'Unable to connect to KrishiRakshak AI backend.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="workspace-card">
      <div className="workspace-header">
        <p className="eyebrow">
          AI CROP VISION
        </p>

        <h1>
          📸 Crop Disease Detection
        </h1>

        <p>
          Upload a crop image for analysis through the
          KrishiRakshak AI vision pipeline.
        </p>
      </div>

      <div className="disease-upload">

        <label className="upload-box">
          <span className="upload-icon">
            📷
          </span>

          <strong>
            Select Crop Image
          </strong>

          <small>
            JPG, PNG or WEBP • Maximum 10 MB
          </small>

          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
        </label>

        {preview && (
          <div className="disease-preview">
            <img
              src={preview}
              alt="Selected crop"
            />
          </div>
        )}

      </div>

      {error && (
        <div className="recommendation">
          <strong>
            ⚠️ Upload / Analysis Error
          </strong>

          <p>
            {error}
          </p>
        </div>
      )}

      <button
        className="recommend-button"
        onClick={analyzeDisease}
        disabled={!image || loading}
      >
        {loading
          ? 'Analyzing Image... ⏳'
          : 'Analyze With AI Vision 🔍'}
      </button>

      {result && (
        <div className="recommendation disease-result">

          {Number(result.confidenceScore || 0) < 60 && (
  <div className="confidence-warning">
    <span>⚠️</span>

    <div>
      <strong>
        Low Confidence — Verify Diagnosis
      </strong>

      <p>
        The AI model is not sufficiently confident
        in this prediction. Please inspect the crop
        and confirm the diagnosis with agricultural
        guidance before taking treatment action.
      </p>
    </div>
  </div>
)}

          <p>
            <b>Status:</b>{' '}
            {result.disease}
          </p>

          <p>
            <b>Severity:</b>{' '}
            {result.severity}
          </p>

           <div className="confidence-section">
  <div className="confidence-header">
    <span>AI Confidence</span>

    <strong>
      {result.confidence}
    </strong>
  </div>

  <div className="confidence-bar">
    <div
      className="confidence-fill"
      style={{
        width: `${Math.min(
          Number(result.confidenceScore || 0),
          100
        )}%`,
      }}
    />
  </div>

  <small>
    Confidence indicates how strongly the model
    supports this prediction.
  </small>
</div>

          <div className="disease-guidance-grid">

  <div className="guidance-card">
    <span className="guidance-icon">
      🔎
    </span>

    <div>
      <h3>What the AI Observed</h3>
      <p>
        {result.observation}
      </p>
    </div>
  </div>

  <div className="guidance-card">
    <span className="guidance-icon">
      🌱
    </span>

    <div>
      <h3>Recommended Action</h3>
      <p>
        {result.action}
      </p>
    </div>
  </div>

  <div className="guidance-card">
    <span className="guidance-icon">
      🛡️
    </span>

    <div>
      <h3>Prevention</h3>
      <p>
        {result.prevention}
      </p>
    </div>
  </div>

</div>

          <small>
            Engine: {result.engine}
          </small>

        </div>
      )}

      <div className="disease-note">
        ⚠️ AI vision results are decision-support only.
        Do not apply pesticides or treatments based only
        on an automated result. Verify important decisions
        with a qualified agricultural expert.
      </div>

    </section>
  )
}

export default DiseaseDetection
