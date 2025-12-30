import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Token rotation system - supports comma-separated tokens
function getTokens(): string[] {
  const tokensEnv = Deno.env.get('HUGGINGFACE_TOKENS') || '';
  return tokensEnv.split(',').map(t => t.trim()).filter(t => t.length > 0);
}

let currentTokenIndex = 0;
function getNextToken(): string {
  const tokens = getTokens();
  if (tokens.length === 0) {
    throw new Error('No Hugging Face tokens configured. Add HUGGINGFACE_TOKENS secret.');
  }
  const token = tokens[currentTokenIndex];
  currentTokenIndex = (currentTokenIndex + 1) % tokens.length;
  console.log(`Using token ${currentTokenIndex === 0 ? tokens.length : currentTokenIndex} of ${tokens.length}`);
  return token;
}

async function callDeepSeek(prompt: string, retryCount = 0): Promise<string> {
  const tokens = getTokens();
  const maxRetries = Math.max(tokens.length * 2, 3);
  const token = getNextToken();
  
  try {
    console.log('Calling DeepSeek R1 32B model...');
    
    const response = await fetch(
      "https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 2048,
            temperature: 0.7,
            return_full_text: false,
            do_sample: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DeepSeek API error: ${response.status}`, errorText);
      
      // Rate limited or model loading - retry with next token
      if ((response.status === 429 || response.status === 503) && retryCount < maxRetries) {
        console.log(`Retrying with next token (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
        return callDeepSeek(prompt, retryCount + 1);
      }
      
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('DeepSeek raw response type:', typeof data, Array.isArray(data));
    
    // Handle response formats
    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text;
    } else if (data.generated_text) {
      return data.generated_text;
    } else if (typeof data === 'string') {
      return data;
    }
    
    console.log('Unexpected response format:', JSON.stringify(data).slice(0, 300));
    return JSON.stringify(data);
    
  } catch (error: any) {
    console.error('DeepSeek call error:', error.message);
    
    if (retryCount < maxRetries) {
      console.log(`Retrying after error (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return callDeepSeek(prompt, retryCount + 1);
    }
    
    throw error;
  }
}

function generateUserData() {
  const firstNames = ['James', 'Emma', 'Michael', 'Olivia', 'William', 'Sophia', 'Alexander', 'Isabella', 'Benjamin', 'Charlotte'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Moore'];
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'protonmail.com', 'icloud.com'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const randomNum = Math.floor(Math.random() * 9999);
  const domain = domains[Math.floor(Math.random() * domains.length)];
  
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}${lastName.toLowerCase()}${randomNum}@${domain}`,
    username: `${firstName.toLowerCase()}_${randomNum}`,
    password: `Secure${randomNum}!Pass#${Math.floor(Math.random() * 100)}`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, message, history = [] } = await req.json();
    const taskDescription = description || message;
    
    console.log('Planning task:', taskDescription);

    const userData = generateUserData();
    
    const prompt = `You are an autonomous browser automation AI. Analyze the user's request and create PRECISE browser automation steps.

USER REQUEST: "${taskDescription}"

GENERATED USER DATA (use this for any account creation):
- Full Name: ${userData.fullName}
- First Name: ${userData.firstName}
- Last Name: ${userData.lastName}
- Email: ${userData.email}
- Username: ${userData.username}
- Password: ${userData.password}

AVAILABLE ACTIONS:
1. navigate - Go to URL. Set value = the full URL.
2. click - Click element. Set target = CSS selector (prefer: button, a, input[type=submit]) or use text=ButtonText format.
3. type - Type text into input. Set target = CSS selector (prefer: input[name=...], input[type=...], #id), value = text to type.
4. wait - Wait milliseconds. Set value = number (e.g., "2000").
5. scroll - Scroll page. Set value = "down", "up", or pixel number.
6. screenshot - Take screenshot for feedback.
7. wait_for_captcha - PAUSE for human to solve captcha manually.
8. press_key - Press keyboard key. Set value = key name (Enter, Tab, Escape).
9. select - Select dropdown option. Set target = selector, value = option value.

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanation, no \`\`\` blocks.
2. Start with {"thinking": "brief plan", "steps": [...]}
3. Every step needs: action, target (or null), value (or null), description.
4. Use REAL selectors - inspect common sites: input[name="email"], button[type="submit"], etc.
5. Add screenshot steps after important actions.
6. Add wait steps (1000-2000ms) after navigation and before interactions.
7. For signup/login forms, the flow is usually: navigate → wait → fill fields → click submit → wait_for_captcha (if any) → screenshot.

EXAMPLE OUTPUT:
{"thinking":"I will navigate to the site, locate the signup form, fill in the registration details, and submit.","steps":[{"action":"navigate","target":null,"value":"https://example.com/signup","description":"Go to signup page"},{"action":"wait","target":null,"value":"2000","description":"Wait for page load"},{"action":"type","target":"input[name=email]","value":"${userData.email}","description":"Enter email"},{"action":"type","target":"input[name=password]","value":"${userData.password}","description":"Enter password"},{"action":"click","target":"button[type=submit]","value":null,"description":"Click submit"},{"action":"wait_for_captcha","target":null,"value":null,"description":"Solve captcha if present"},{"action":"screenshot","target":null,"value":null,"description":"Capture result"}]}

NOW OUTPUT JSON ONLY:`;

    const aiResponse = await callDeepSeek(prompt);
    console.log('AI response length:', aiResponse.length);
    console.log('AI response preview:', aiResponse.slice(0, 500));

    // Parse JSON from response
    let result = { thinking: '', steps: [] as any[] };
    
    try {
      // Try to find JSON object in response
      const jsonMatch = aiResponse.match(/\{[\s\S]*?"thinking"[\s\S]*?"steps"[\s\S]*?\}/);
      if (jsonMatch) {
        // Clean up common issues
        let jsonStr = jsonMatch[0];
        // Remove any trailing content after the last }
        const lastBrace = jsonStr.lastIndexOf('}');
        jsonStr = jsonStr.slice(0, lastBrace + 1);
        
        result = JSON.parse(jsonStr);
      } else {
        // Try to find just an array of steps
        const arrayMatch = aiResponse.match(/\[[\s\S]*?\]/);
        if (arrayMatch) {
          result.steps = JSON.parse(arrayMatch[0]);
          result.thinking = 'Executing automation plan';
        }
      }
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError.message);
      console.log('Attempting fallback parsing...');
      
      // Fallback: extract URL and create basic steps
      const urlMatch = taskDescription.match(/https?:\/\/[^\s]+/) || taskDescription.match(/\b[\w-]+\.(com|org|net|io|dev|co)\b/);
      if (urlMatch) {
        const url = urlMatch[0].startsWith('http') ? urlMatch[0] : `https://${urlMatch[0]}`;
        result = {
          thinking: `Navigating to ${url} and analyzing the page`,
          steps: [
            { action: "navigate", target: null, value: url, description: `Go to ${url}` },
            { action: "wait", target: null, value: "2000", description: "Wait for page to load" },
            { action: "screenshot", target: null, value: null, description: "Capture page state" }
          ]
        };
      } else {
        throw new Error('Could not parse AI response into automation steps');
      }
    }

    // Validate and filter steps
    const validActions = ['navigate', 'click', 'type', 'wait', 'scroll', 'screenshot', 'wait_for_captcha', 'press_key', 'select'];
    result.steps = result.steps.filter((step: any) => 
      step && typeof step.action === 'string' && validActions.includes(step.action)
    );

    if (result.steps.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No valid automation steps could be generated',
        rawResponse: aiResponse.slice(0, 500)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generated ${result.steps.length} steps`);

    return new Response(JSON.stringify({ 
      thinking: result.thinking,
      steps: result.steps,
      userData,
      model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
      tokensConfigured: getTokens().length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Planner error:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
