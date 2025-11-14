interface RiskResult {
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  flags: string[]
}

const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  aadhaar: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
  pan: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
}

const INJECTION_PATTERNS = [
  /ignore\s+(previous|above|prior)\s+(instructions|prompts?|commands?)/gi,
  /forget\s+(everything|all|previous|above)/gi,
  /you\s+are\s+now/gi,
  /new\s+instructions?/gi,
  /system\s+prompt/gi,
  /jailbreak/gi,
  /DAN\s+mode/gi,
]

const SENSITIVE_KEYWORDS = [
  'password',
  'secret',
  'confidential',
  'private key',
  'api key',
  'token',
  'credential',
  'auth',
]

export function calculateRiskScore(
  prompt: string,
  response: string,
  model: string,
  policies: any = {}
): RiskResult {
  let score = 0
  const flags: string[] = []

  const combinedText = `${prompt} ${response}`.toLowerCase()

  // PII Detection
  if (policies.enablePiiDetection !== false) {
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      const matches = combinedText.match(pattern)
      if (matches) {
        score += 25
        flags.push(`PII_DETECTED_${type.toUpperCase()}`)
      }
    }
  }

  // Prompt Injection Detection
  if (policies.enablePromptInjectionDetection !== false) {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(combinedText)) {
        score += 30
        flags.push('PROMPT_INJECTION_DETECTED')
        break
      }
    }
  }

  // Sensitive Content Detection
  if (policies.enableSensitiveContentDetection !== false) {
    for (const keyword of SENSITIVE_KEYWORDS) {
      if (combinedText.includes(keyword)) {
        score += 15
        flags.push('SENSITIVE_KEYWORD_DETECTED')
        break
      }
    }
  }

  // Blocked Keywords
  if (policies.blockedKeywords && Array.isArray(policies.blockedKeywords)) {
    for (const keyword of policies.blockedKeywords) {
      if (combinedText.includes(keyword.toLowerCase())) {
        score += 20
        flags.push(`BLOCKED_KEYWORD: ${keyword}`)
      }
    }
  }

  // Blocked Models
  if (policies.blockedModels && Array.isArray(policies.blockedModels)) {
    if (policies.blockedModels.some((m: string) => model.toLowerCase().includes(m.toLowerCase()))) {
      score += 40
      flags.push('BLOCKED_MODEL_USED')
    }
  }

  // Token Length Check
  const tokenEstimate = (prompt.length + response.length) / 4 // rough estimate
  const maxTokens = policies.maxTokens || 4000
  if (tokenEstimate > maxTokens) {
    score += 10
    flags.push('TOKEN_LIMIT_EXCEEDED')
  }

  // Cap score at 100
  score = Math.min(score, 100)

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical'
  if (score < 30) riskLevel = 'low'
  else if (score < 70) riskLevel = 'medium'
  else if (score < 90) riskLevel = 'high'
  else riskLevel = 'critical'

  return {
    riskScore: score,
    riskLevel,
    flags,
  }
}
