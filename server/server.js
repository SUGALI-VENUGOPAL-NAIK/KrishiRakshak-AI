import http from 'http'
import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

const PORT = process.env.PORT || 5000

const ROOT_DIR = path.resolve(process.cwd())
const PYTHON = path.join(ROOT_DIR, '.venv', 'bin', 'python')
const PREDICT_SCRIPT = path.join(
  ROOT_DIR,
  'vision',
  'predict_image.py'
)

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, headers)
  res.end(JSON.stringify(data))
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/*
|--------------------------------------------------------------------------
| FARMER QUESTION ENGINE
|--------------------------------------------------------------------------
*/

function answerQuestion(question) {
  const q = normalize(question)

  if (
    (q.includes('groundnut') || q.includes('peanut')) &&
    (q.includes('water') ||
      q.includes('irrigation') ||
      q.includes('irrigate'))
  ) {
    return {
      answer:
        'Groundnut needs timely irrigation during important crop-growth stages. Check soil moisture before irrigating and avoid waterlogging.',
      category: 'Groundnut • Irrigation',
      confidence: 'High',
      tips: [
        'Check soil moisture before watering.',
        'Avoid prolonged waterlogging.',
        'Consider recent rainfall.',
        'Monitor flowering and pod development stages.'
      ]
    }
  }

  if (
    (q.includes('groundnut') || q.includes('peanut')) &&
    (q.includes('yellow') ||
      q.includes('yellowing') ||
      q.includes('leaf'))
  ) {
    return {
      answer:
        'Yellowing in groundnut can have several causes including nutrient stress, water-related stress or disease. Inspect the leaves and soil before treatment.',
      category: 'Groundnut • Crop Health',
      confidence: 'Medium',
      tips: [
        'Inspect older and newer leaves.',
        'Check soil moisture.',
        'Look for spots or pest activity.',
        'Avoid treatment before identifying the likely cause.'
      ]
    }
  }

  if (
    (q.includes('rice') || q.includes('paddy')) &&
    (q.includes('water') ||
      q.includes('irrigation') ||
      q.includes('irrigate'))
  ) {
    return {
      answer:
        'Rice requires careful water management. Irrigation depends on crop stage, soil condition, rainfall and field drainage.',
      category: 'Rice • Irrigation',
      confidence: 'High',
      tips: [
        'Monitor field water conditions.',
        'Consider recent rainfall.',
        'Maintain proper drainage.',
        'Adjust water management according to crop stage.'
      ]
    }
  }

  if (
    (q.includes('rice') || q.includes('paddy')) &&
    (q.includes('yellow') ||
      q.includes('yellowing') ||
      q.includes('leaf'))
  ) {
    return {
      answer:
        'Yellowing in rice may be associated with nutrient imbalance, water stress, root problems or disease.',
      category: 'Rice • Crop Health',
      confidence: 'Medium',
      tips: [
        'Check water conditions.',
        'Inspect leaf patterns.',
        'Look for pest or disease symptoms.',
        'Use locally recommended nutrient management.'
      ]
    }
  }

  if (
    q.includes('cotton') &&
    (q.includes('water') ||
      q.includes('irrigation') ||
      q.includes('irrigate'))
  ) {
    return {
      answer:
        'Cotton irrigation should be adjusted according to soil moisture, crop stage and rainfall. Avoid both severe water stress and prolonged waterlogging.',
      category: 'Cotton • Irrigation',
      confidence: 'High',
      tips: [
        'Monitor soil moisture.',
        'Consider recent rainfall.',
        'Avoid prolonged waterlogging.',
        'Pay attention during flowering and boll development.'
      ]
    }
  }

  if (
    q.includes('chickpea') &&
    (q.includes('water') ||
      q.includes('irrigation') ||
      q.includes('irrigate'))
  ) {
    return {
      answer:
        'Chickpea generally needs careful irrigation. Avoid excessive watering and consider soil moisture, rainfall and crop stage.',
      category: 'Chickpea • Irrigation',
      confidence: 'High',
      tips: [
        'Avoid excessive irrigation.',
        'Check soil moisture before watering.',
        'Consider rainfall.',
        'Maintain good field drainage.'
      ]
    }
  }

  return {
    answer:
      'I can provide general crop-health guidance, but the question needs more specific crop or symptom information.',
    category: 'General Crop Guidance',
    confidence: 'Low',
    tips: [
      'Mention the crop name.',
      'Describe the visible symptom.',
      'Mention irrigation or soil conditions if relevant.',
      'Verify important treatment decisions with a qualified agricultural expert.'
    ]
  }
}

/*
|--------------------------------------------------------------------------
| CROP DISEASE VISION
|--------------------------------------------------------------------------
*/

function parsePredictionOutput(output) {
  const text = String(output || '')

  const diseaseMatch = text.match(
    /Disease\s*:\s*(.+)/i
  )

  const classMatch = text.match(
    /Class\s*:\s*(\d+)/i
  )

  const confidenceMatch = text.match(
    /Confidence\s*:\s*([\d.]+)%/i
  )

  if (!diseaseMatch || !confidenceMatch) {
    return null
  }

  return {
    disease: diseaseMatch[1].trim(),
    class: classMatch
      ? Number(classMatch[1])
      : null,
    confidence: Number(confidenceMatch[1])
  }
}

function severityFromConfidence(confidence) {
  if (confidence >= 80) {
    return 'High confidence'
  }

  if (confidence >= 60) {
    return 'Moderate confidence'
  }

  return 'Low confidence'
}

function diseaseGuidance(disease, confidence) {
  const lowConfidence =
    confidence < 60

  let observation = ''
  let action = ''
  let prevention = ''

  if (disease === 'Bacterial Leaf Blight') {
    observation =
      'The model detected a pattern associated with Bacterial Leaf Blight.'

    action =
      'Inspect affected leaves and field water conditions. Avoid making pesticide decisions from this prediction alone. Confirm the diagnosis with agricultural guidance.'

    prevention =
      'Monitor water management, field drainage and nearby plants. Remove or manage severely affected material according to local agricultural recommendations.'
  } else if (disease === 'Brown Spot') {
    observation =
      'The model detected a pattern associated with Brown Spot.'

    action =
      'Inspect leaves for characteristic brown lesions and check crop nutrition and field conditions before treatment.'

    prevention =
      'Maintain balanced crop nutrition, avoid unnecessary stress and continue regular field monitoring.'
  } else if (disease === 'Leaf Blast') {
    observation =
      'The model detected a pattern associated with Leaf Blast.'

    action =
      'Inspect leaves for blast-like lesions and verify the diagnosis before applying any treatment.'

    prevention =
      'Monitor crop density, nitrogen management, field conditions and disease spread.'
  } else if (disease === 'Tungro') {
    observation =
      'The model detected a pattern associated with Tungro.'

    action =
      'Inspect plants for tungro-like symptoms and check for vector activity. Confirm the diagnosis before treatment.'

    prevention =
      'Monitor the crop regularly and manage disease vectors according to locally recommended agricultural practices.'
  } else {
    observation =
      'The model produced a disease classification, but the disease label is not recognized by the current guidance database.'

    action =
      'Verify the result with a qualified agricultural expert before taking treatment action.'

    prevention =
      'Continue crop monitoring and compare affected plants with healthy plants.'
  }

  if (lowConfidence) {
    observation +=
      ' The current model confidence is below the project confidence threshold, so this should be treated as an uncertain result.'
  }

  return {
    observation,
    action,
    prevention
  }
}

function runVisionPrediction(imagePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(PYTHON)) {
      reject(
        new Error(
          `Python environment not found: ${PYTHON}`
        )
      )
      return
    }

    if (!fs.existsSync(PREDICT_SCRIPT)) {
      reject(
        new Error(
          `Prediction script not found: ${PREDICT_SCRIPT}`
        )
      )
      return
    }

    const child = spawn(
      PYTHON,
      [PREDICT_SCRIPT, imagePath],
      {
        cwd: ROOT_DIR
      }
    )

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('error', (error) => {
      reject(error)
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() ||
              stdout.trim() ||
              `Vision process exited with code ${code}`
          )
        )
        return
      }

      const prediction =
        parsePredictionOutput(stdout)

      if (!prediction) {
        reject(
          new Error(
            'Unable to parse prediction from Python vision engine.'
          )
        )
        return
      }

      resolve(prediction)
    })
  })
}

/*
|--------------------------------------------------------------------------
| MULTIPART IMAGE UPLOAD
|--------------------------------------------------------------------------
|
| This parser intentionally handles the simple single-file upload
| produced by DiseaseDetection.jsx:
|
| FormData field: image
|
|--------------------------------------------------------------------------
*/

function parseMultipartImage(req) {
  return new Promise((resolve, reject) => {
    const contentType =
      req.headers['content-type'] || ''

    const boundaryMatch =
      contentType.match(
        /boundary=(?:"([^"]+)"|([^;]+))/i
      )

    if (!boundaryMatch) {
      reject(
        new Error(
          'Multipart boundary not found.'
        )
      )
      return
    }

    const boundary =
      boundaryMatch[1] ||
      boundaryMatch[2]

    const chunks = []

    let totalSize = 0

    req.on('data', (chunk) => {
      totalSize += chunk.length

      if (totalSize > 12 * 1024 * 1024) {
        reject(
          new Error(
            'Uploaded image is too large.'
          )
        )

        req.destroy()
        return
      }

      chunks.push(chunk)
    })

    req.on('error', reject)

    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks)

        const boundaryBuffer =
          Buffer.from(`--${boundary}`)

        const start =
          body.indexOf(boundaryBuffer)

        if (start === -1) {
          throw new Error(
            'Multipart data could not be parsed.'
          )
        }

        const headerStart =
          body.indexOf(
            Buffer.from('\r\n\r\n'),
            start
          )

        if (headerStart === -1) {
          throw new Error(
            'Multipart headers not found.'
          )
        }

        const dataStart =
          headerStart + 4

        const nextBoundary =
          body.indexOf(
            boundaryBuffer,
            dataStart
          )

        if (nextBoundary === -1) {
          throw new Error(
            'Multipart ending boundary not found.'
          )
        }

        let dataEnd =
          nextBoundary

        if (
          body[dataEnd - 2] === 13 &&
          body[dataEnd - 1] === 10
        ) {
          dataEnd -= 2
        }

        const headerText =
          body
            .slice(start, dataStart)
            .toString('utf8')

        const filenameMatch =
          headerText.match(
            /filename="([^"]*)"/i
          )

        const contentTypeMatch =
          headerText.match(
            /Content-Type:\s*([^\r\n]+)/i
          )

        const filename =
          filenameMatch
            ? path.basename(
                filenameMatch[1]
              )
            : 'crop-image'

        const mimeType =
          contentTypeMatch
            ? contentTypeMatch[1].trim()
            : 'application/octet-stream'

        const imageBuffer =
          body.slice(
            dataStart,
            dataEnd
          )

        if (imageBuffer.length === 0) {
          throw new Error(
            'Empty image received.'
          )
        }

        resolve({
          filename,
          mimeType,
          buffer: imageBuffer,
          size: imageBuffer.length
        })
      } catch (error) {
        reject(error)
      }
    })
  })
}

/*
|--------------------------------------------------------------------------
| DISEASE ANALYSIS
|--------------------------------------------------------------------------
*/

async function analyzeCropImage(image) {
  if (
    !image ||
    !image.buffer ||
    image.size === 0
  ) {
    return {
      success: false,
      message: 'Empty image received.'
    }
  }

  const tempDirectory =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'krishirakshak-'
      )
    )

  const safeFilename =
    image.filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')

  const imagePath =
    path.join(
      tempDirectory,
      safeFilename
    )

  try {
    fs.writeFileSync(
      imagePath,
      image.buffer
    )

    console.log(
      `📷 Vision request: ${image.filename}`
    )

    const prediction =
      await runVisionPrediction(
        imagePath
      )

    const confidence =
      Number(prediction.confidence)

    const guidance =
      diseaseGuidance(
        prediction.disease,
        confidence
      )

    return {
      success: true,

      disease: prediction.disease,

      severity:
        severityFromConfidence(
          confidence
        ),

      confidence:
        `${confidence.toFixed(2)}%`,

      observation:
        guidance.observation,

      action:
        guidance.action,

      prevention:
        guidance.prevention,

      filename:
        image.filename,

      imageSize:
        image.size,

      engine:
        'KrishiRakshak Vision Pipeline v2 • Local ONNX',

      modelStatus:
        'CONNECTED',

      model:
        'rice_disease_resnet50.onnx',

      modelClass:
        prediction.class,

      confidenceScore:
        confidence
    }
  } finally {
    try {
      fs.rmSync(
        tempDirectory,
        {
          recursive: true,
          force: true
        }
      )
    } catch {
      // Ignore temporary cleanup errors.
    }
  }
}

/*
|--------------------------------------------------------------------------
| HTTP SERVER
|--------------------------------------------------------------------------
*/

const server = http.createServer(
  async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(
        204,
        headers
      )
      res.end()
      return
    }

    // HEALTH
    if (
      req.method === 'GET' &&
      req.url === '/api/health'
    ) {
      sendJSON(res, 200, {
        success: true,
        status: 'OK',
        service:
          'KrishiRakshak AI Backend',
        vision:
          'Local ONNX Vision Engine',
        model:
          'rice_disease_resnet50.onnx',
        modelStatus:
          fs.existsSync(
            path.join(
              ROOT_DIR,
              'vision',
              'models',
              'rice_disease_resnet50.onnx'
            )
          )
            ? 'CONNECTED'
            : 'MODEL_NOT_FOUND'
      })

      return
    }

    // AI ASSISTANT
    if (
      req.method === 'POST' &&
      req.url === '/api/ask'
    ) {
      let body = ''

      req.on('data', (chunk) => {
        body += chunk.toString()

        if (body.length > 1000000) {
          req.destroy()
        }
      })

      req.on('end', () => {
        try {
          const parsed =
            JSON.parse(body)

          if (
            !parsed.question ||
            !String(
              parsed.question
            ).trim()
          ) {
            sendJSON(res, 400, {
              success: false,
              message:
                'Question is required.'
            })

            return
          }

          const result =
            answerQuestion(
              parsed.question
            )

          sendJSON(res, 200, {
            success: true,
            ...result
          })
        } catch (error) {
          sendJSON(res, 400, {
            success: false,
            message:
              'Invalid JSON request.'
          })
        }
      })

      return
    }

    // DISEASE IMAGE
    if (
      req.method === 'POST' &&
      req.url === '/api/disease'
    ) {
      try {
        const image =
          await parseMultipartImage(
            req
          )

        const result =
          await analyzeCropImage(
            image
          )

        sendJSON(
          res,
          result.success ? 200 : 400,
          result
        )
      } catch (error) {
        console.error(
          '❌ Disease analysis error:',
          error.message
        )

        sendJSON(res, 500, {
          success: false,
          message:
            error.message ||
            'Disease analysis failed.'
        })
      }

      return
    }

    // 404
    sendJSON(res, 404, {
      success: false,
      message: 'Route not found.'
    })
  }
)

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `❌ Port ${PORT} is already in use.`
    )

    console.error(
      'Stop the existing KrishiRakshak backend and start this server again.'
    )

    return
  }

  console.error(
    '❌ Server error:',
    error
  )
})

server.listen(
  PORT,
  () => {
    console.log('')
    console.log(
      '🌾 KrishiRakshak AI Backend'
    )
    console.log(
      '--------------------------------'
    )
    console.log(
      `🚀 Server: http://localhost:${PORT}`
    )
    console.log(
      '🤖 AI:     POST /api/ask'
    )
    console.log(
      '📷 Vision: POST /api/disease'
    )
    console.log(
      '❤️ Health: GET  /api/health'
    )
    console.log(
      '--------------------------------'
    )
    console.log(
      `🐍 Python: ${PYTHON}`
    )
    console.log(
      `🧠 Model:  ${path.join(
        ROOT_DIR,
        'vision',
        'models',
        'rice_disease_resnet50.onnx'
      )}`
    )
    console.log('')
  }
)
