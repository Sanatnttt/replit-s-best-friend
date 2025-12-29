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
    const { description, history = [] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Planning task:', description);

    const systemPrompt = `You are a browser automation planner. Given a task description, break it down into specific browser actions that Playwright can execute.

IMPORTANT RULES:
1. Always start with a "navigate" action to the target URL
2. Use realistic CSS selectors or text-based selectors
3. Add "wait" actions after navigation and before interacting with elements
4. For account creation, generate realistic fake data
5. If the task requires solving a captcha, add a "wait_for_captcha" action - the human will solve it manually
6. Add "screenshot" actions at important steps for feedback

Return a JSON object with:
- "thinking": A brief explanation of your plan (1-2 sentences)
- "steps": An array of step objects

Each step has:
- action: One of "navigate", "click", "type", "wait", "scroll", "screenshot", "wait_for_captcha", "press_key"
- target: CSS selector, text selector like "text=Submit", or element description
- value: Text to type, URL to navigate, milliseconds to wait, or key to press
- description: Human-readable description of this step

Example for "Go to github.com and create an account with email test@example.com":
{
  "thinking": "I'll navigate to GitHub, click sign up, and fill in the registration form with the provided email.",
  "steps": [
    {"action": "navigate", "target": null, "value": "https://github.com", "description": "Open GitHub homepage"},
    {"action": "wait", "target": null, "value": "2000", "description": "Wait for page to load"},
    {"action": "screenshot", "target": null, "value": "homepage", "description": "Capture homepage"},
    {"action": "click", "target": "text=Sign up", "value": null, "description": "Click Sign up button"},
    {"action": "wait", "target": null, "value": "2000", "description": "Wait for signup form"},
    {"action": "type", "target": "#email", "value": "test@example.com", "description": "Enter email address"},
    {"action": "type", "target": "#password", "value": "SecurePass123!", "description": "Enter password"},
    {"action": "type", "target": "#login", "value": "testuser123", "description": "Enter username"},
    {"action": "screenshot", "target": null, "value": "form-filled", "description": "Capture filled form"},
    {"action": "click", "target": "text=Continue", "value": null, "description": "Click continue"},
    {"action": "wait_for_captcha", "target": null, "value": null, "description": "Wait for human to solve captcha if present"},
    {"action": "screenshot", "target": null, "value": "result", "description": "Capture final result"}
  ]
}

ONLY return valid JSON, no markdown or other text.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.map((m: any) => ({ role: m.role, content: m.content })),
          { role: 'user', content: `Task: ${description}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('AI planning failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    console.log('AI response:', content);
    
    // Parse the JSON from the response
    let result = { thinking: '', steps: [] };
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      result = {
        thinking: 'I encountered an issue parsing the plan. Please try rephrasing your request.',
        steps: []
      };
    }

    console.log('Planned steps:', result.steps?.length || 0);

    return new Response(JSON.stringify(result), {
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
