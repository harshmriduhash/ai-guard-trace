import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { calculateRiskScore } from '../_shared/riskEngine.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { prompt, response, model, metadata, apiKey } = await req.json()

    // Validate API key
    const { data: app } = await supabaseClient
      .from('applications')
      .select('id, org_id, active')
      .eq('api_key_hash', apiKey)
      .single()

    if (!app || !app.active) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get policies for the organization
    const { data: policies } = await supabaseClient
      .from('policies')
      .select('rules')
      .eq('org_id', app.org_id)
      .single()

    // Calculate risk score
    const riskResult = calculateRiskScore(prompt, response, model, policies?.rules || {})

    // Store log
    const { data: log, error: logError } = await supabaseClient
      .from('logs')
      .insert({
        org_id: app.org_id,
        application_id: app.id,
        prompt,
        response,
        model,
        risk_score: riskResult.riskScore,
        risk_level: riskResult.riskLevel,
        risk_flags: riskResult.flags,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (logError) throw logError

    return new Response(
      JSON.stringify({ 
        success: true, 
        logId: log.id,
        riskScore: riskResult.riskScore,
        riskLevel: riskResult.riskLevel,
        flags: riskResult.flags,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
