
import os
import re

def clean_emojis_and_fix(text):
    # Regex to catch common emojis and specific broken mojibake chars like dY"? or "?
    # For safety, we will just strip known emoji characters or use a generic emoji regex
    # Since mojibake is present, let"s explicitly remove things like , dY, etc if they are alone, but it"s tricky.
    # A simpler way is to remove all non-ascii characters, EXCEPT we want to keep normal formatting.
    
    # We will strip out specific emojis manually from the text that we know are in the source:
    emojis = ["?", "??", "??", "??", "??", "??", "??", "???", "??", "?", "?", "?", "?", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??"]
    for e in emojis:
        text = text.replace(e, "")
    
    # Clean up mojibake from the terminal output we saw
    mojibake = ["\"?", "dY\"?", "dY\"<", "dY", "+", "dY\"", "dY\"  ", "dYs?", "o.", "o ", "?\""]
    for m in mojibake:
        text = text.replace(m, "")
        
    return text

def process_html_file(filepath):
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    # Remove emojis
    content = clean_emojis_and_fix(content)
    
    # Add filled-state toggler to all inputs
    # We find all <input and add a generic class toggler for filled-state
    # Or just add a small script at the end of the file
    script_inject = """
<script>
document.addEventListener("input", function(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
        if (e.target.value && e.target.value !== "0" && e.target.value.trim() !== "") {
            e.target.classList.add("filled-state");
        } else {
            e.target.classList.remove("filled-state");
        }
    }
});
</script>
</body>
"""
    if "</body>" in content and "filled-state" not in content:
        content = content.replace("</body>", script_inject)
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

def process_js_file(filepath):
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    content = clean_emojis_and_fix(content)
    
    # Specific styling logic for JS generated elements
    content = content.replace("rgba(79,70,229,.25)", "var(--bg)")
    content = content.replace("color:#818cf8;", "color:var(--text);")
    content = content.replace("rgba(245,158,11,.2)", "var(--bg)")
    content = content.replace("color:#fbbf24;", "color:var(--text);")
    content = content.replace("rgba(239,68,68,.2)", "var(--bg)")
    content = content.replace("color:#f87171;", "color:var(--text);")
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

# Process all public files
public_dir = "public"
for root, dirs, files in os.walk(public_dir):
    for file in files:
        filepath = os.path.join(root, file)
        if file.endswith(".html"):
            process_html_file(filepath)
        elif file.endswith(".js"):
            process_js_file(filepath)

