import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, targetUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Planning task:', description);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a browser automation planner. Given a task description, break it down into specific browser actions.

Return a JSON array of steps. Each step has:
- action: One of "navigate", "click", "type", "wait", "scroll", "screenshot"
- target: CSS selector or description of the element (for click/type)
- value: Text to type (for type action) or URL (for navigate)

Example output for "Go to google.com and search for cats":
[
  {"action": "navigate", "target": null, "value": "https://google.com"},
  {"action": "wait", "target": "search input", "value": "2000"},
  {"action": "type", "target": "textarea[name='q']", "value": "cats"},
  {"action": "click", "target": "Google Search button", "value": null}
]

ONLY return the JSON array, no other text.`
          },
          {
            role: 'user',
            content: `Task: ${description}${targetUrl ? `\nTarget URL: ${targetUrl}` : ''}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error('AI planning failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    // Parse the JSON from the response
    let steps = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        steps = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse steps:', e);
      steps = [{ action: 'navigate', target: null, value: targetUrl || 'https://example.com' }];
    }

    console.log('Planned steps:', steps);

    return new Response(JSON.stringify({ steps }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Planner error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
