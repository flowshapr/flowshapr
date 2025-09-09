const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('🌐 Detailed DaisyUI theme testing...');
    
    // Go to login and authenticate
    console.log('🔐 Logging in...');
    await page.goto('http://localhost:3004/login');
    await page.fill('#email', 'marcel@leantime.io');
    await page.fill('#password', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/app/);
    
    console.log('✅ Logged in successfully');
    await page.waitForTimeout(2000);
    
    // Take screenshot of main app
    await page.screenshot({ path: '/tmp/app_main.png', fullPage: true });
    console.log('📸 Main app screenshot saved');
    
    // Navigate to flow builder
    console.log('🔽 Opening flow builder...');
    await page.waitForTimeout(1000);
    
    // Take screenshot of flow builder
    await page.screenshot({ path: '/tmp/flow_builder_full.png', fullPage: true });
    console.log('📸 Full flow builder screenshot saved');
    
    // Focus on different sections and take targeted screenshots
    console.log('🎯 Taking targeted screenshots...');
    
    // Screenshot the top navigation
    const navbar = page.locator('.navbar');
    if (await navbar.isVisible()) {
      await navbar.screenshot({ path: '/tmp/navbar.png' });
      console.log('📸 Navbar screenshot saved');
    }
    
    // Screenshot the sidebar
    const sidebar = page.locator('[class*="sidebar"], [class*="w-64"]').first();
    if (await sidebar.isVisible()) {
      await sidebar.screenshot({ path: '/tmp/sidebar.png' });
      console.log('📸 Sidebar screenshot saved');
    }
    
    // Screenshot tabs section
    const tabs = page.locator('.tabs');
    if (await tabs.isVisible()) {
      await tabs.screenshot({ path: '/tmp/tabs.png' });
      console.log('📸 Tabs screenshot saved');
    }
    
    // Check for any elements with white backgrounds
    console.log('🔍 Checking for white backgrounds...');
    const whiteElements = await page.$$eval('*', elements => {
      return elements
        .filter(el => {
          const style = window.getComputedStyle(el);
          return style.backgroundColor === 'rgb(255, 255, 255)' || 
                 style.backgroundColor === 'white' ||
                 el.className.includes('bg-white');
        })
        .map(el => ({
          tag: el.tagName,
          className: el.className,
          id: el.id,
          text: el.textContent ? el.textContent.substring(0, 50) + '...' : ''
        }))
        .slice(0, 10); // Limit to first 10
    });
    
    if (whiteElements.length > 0) {
      console.log('⚠️  Found elements with white backgrounds:');
      whiteElements.forEach((el, i) => {
        console.log(`${i + 1}. ${el.tag} class="${el.className}" id="${el.id}" text="${el.text}"`);
      });
    } else {
      console.log('✅ No white background elements found!');
    }
    
    // Check ReactFlow nodes specifically
    console.log('🔍 Checking ReactFlow nodes...');
    const reactFlowNodes = page.locator('.react-flow__node, [data-testid*="node"]');
    const nodeCount = await reactFlowNodes.count();
    
    if (nodeCount > 0) {
      console.log(`📦 Found ${nodeCount} ReactFlow nodes`);
      await reactFlowNodes.first().screenshot({ path: '/tmp/reactflow_node.png' });
      console.log('📸 ReactFlow node screenshot saved');
      
      // Check node text colors
      const nodeStyles = await reactFlowNodes.first().evaluate(node => {
        const style = window.getComputedStyle(node);
        return {
          backgroundColor: style.backgroundColor,
          color: style.color,
          className: node.className
        };
      });
      console.log('🎨 ReactFlow node styles:', nodeStyles);
    }
    
    console.log('🎨 Current theme:', await page.getAttribute('html', 'data-theme'));
    
    await page.waitForTimeout(5000); // Keep browser open to inspect
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await browser.close();
  }
})();