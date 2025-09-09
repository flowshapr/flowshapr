/**
 * Template utilities for handling variable replacement in prompts
 * Inspired by Genkit's Handlebars templating system but adapted for code generation
 */

/**
 * Extract all template variables from a string (e.g., {{variable}}, {{ step1 }})
 * @param template The template string
 * @returns Array of variable names found in the template
 */
export function extractTemplateVariables(template: string): string[] {
  const regex = /\{\{\s*([^}]+)\s*\}\}/g;
  const variables = new Set<string>();
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    const varName = match[1].trim();
    variables.add(varName);
  }
  
  return Array.from(variables);
}

/**
 * Generate JavaScript code that creates a template replacement function
 * This creates code that will replace template variables at runtime
 * @param template The template string with {{variables}}
 * @param contextVar The name of the context variable (usually 'ctx')
 * @param availableVars Array of available variable names in the current scope
 * @returns JavaScript code that replaces template variables
 */
export function generateTemplateCode(
  template: string, 
  contextVar: string = 'ctx',
  availableVars: string[] = []
): string {
  const templateVars = extractTemplateVariables(template);
  
  // If no template variables, return the template as-is
  if (templateVars.length === 0) {
    return JSON.stringify(template);
  }
  
  // Build the replacement logic
  let templateCode = JSON.stringify(template);
  
  // Replace each variable with context access
  for (const varName of templateVars) {
    // Handle different variable patterns
    const patterns = [
      `{{${varName}}}`,           // {{variable}}
      `{{ ${varName} }}`,         // {{ variable }}
      `{{  ${varName}  }}`,       // with extra spaces
    ];
    
    // Check if this variable is available in the current scope
    const isAvailable = availableVars.includes(varName);
    const replacement = isAvailable 
      ? `\${${varName}}` // Direct variable access if available in scope
      : `\${${contextVar}['${varName}']}`; // Context access for step variables
    
    for (const pattern of patterns) {
      templateCode = templateCode.replace(
        new RegExp(pattern.replace(/[{}]/g, '\\$&'), 'g'),
        replacement
      );
    }
  }
  
  return `\`${templateCode.slice(1, -1)}\``;
}

/**
 * Generate context-based template replacement for complex scenarios
 * This creates a more robust template system similar to Genkit's approach
 * @param template The template string
 * @param availableVars Variables available in the current scope
 * @returns JavaScript code that handles template replacement
 */
export function generateContextualTemplateCode(
  template: string, 
  availableVars: string[] = []
): string {
  const templateVars = extractTemplateVariables(template);
  
  // If no template variables, return simple string
  if (templateVars.length === 0) {
    return JSON.stringify(template);
  }
  
  // Build template replacement using template literal with context
  let code = template;
  
  for (const varName of templateVars) {
    // Create a regex that matches the variable with optional whitespace
    const varRegex = new RegExp(`\\{\\{\\s*${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'g');
    
    // Choose the replacement strategy
    if (availableVars.includes(varName)) {
      // Direct variable access if in scope
      code = code.replace(varRegex, `\${${varName}}`);
    } else {
      // Context-based access for step variables
      code = code.replace(varRegex, `\${ctx['${varName}']}`);
    }
  }
  
  return `\`${code}\``;
}

/**
 * Validate that all template variables can be resolved
 * @param template The template string
 * @param availableVars Variables available in the current scope
 * @param contextVars Variables available in the execution context
 * @returns Object with validation result and missing variables
 */
export function validateTemplateVariables(
  template: string, 
  availableVars: string[] = [], 
  contextVars: string[] = []
): { isValid: boolean; missingVars: string[] } {
  const templateVars = extractTemplateVariables(template);
  const allAvailable = [...availableVars, ...contextVars, 'input']; // 'input' is always available
  
  const missingVars = templateVars.filter(varName => !allAvailable.includes(varName));
  
  return {
    isValid: missingVars.length === 0,
    missingVars
  };
}