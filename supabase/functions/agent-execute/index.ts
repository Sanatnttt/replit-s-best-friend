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
    const { step, taskId, targetUrl } = await req.json();
    
    console.log('Executing step:', step);

    // Simulate execution - in production, this would call a Playwright service
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const messages: Record<string, string> = {
      navigate: `Navigated to ${step.value || targetUrl}`,
      click: `Clicked on "${step.target}"`,
      type: `Typed "${step.value}" into "${step.target}"`,
      wait: `Waited ${step.value}ms`,
      scroll: `Scrolled page`,
      screenshot: `Captured screenshot`,
    };

    return new Response(JSON.stringify({ 
      success: true, 
      message: messages[step.action] || 'Step executed',
      note: 'This is a simulated execution. Connect a Playwright service for real browser control.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Execution error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error?.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
