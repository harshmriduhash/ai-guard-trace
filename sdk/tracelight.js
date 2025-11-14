// Tracelight SDK for JavaScript

class Tracelight {
  constructor(apiKey, baseUrl = 'https://ttgcemltjnnrcliyqath.supabase.co/functions/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async trackLLM({ prompt, response, model, metadata = {} }) {
    try {
      const res = await fetch(`${this.baseUrl}/create-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          prompt,
          response,
          model,
          metadata,
        }),
      });

      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Tracelight tracking error:', error);
      throw error;
    }
  }
}

module.exports = Tracelight;
