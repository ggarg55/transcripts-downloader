import os

# Using relative paths based on the script's location
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
input_file = os.path.join(base_dir, "lib", "temp_jszip.md") # Mocked for demonstration
output_file = os.path.join(base_dir, "lib", "jszip.min.js")

def clean_code(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Input file not found: {input_path}")
        return
    
    with open(input_path, 'r') as f:
        lines = f.readlines()

    # Skip metadata/header lines (typically 1-4)
    code_start = 0
    for i, line in enumerate(lines):
        if line.startswith("/*!") or line.strip().startswith("!function"):
            code_start = i
            break

    # Clean up: strip line numbers (e.g., "5: ")
    cleaned_code = []
    for line in lines[code_start:]:
        # Remove line number prefix if present
        if ':' in line:
            parts = line.split(':', 1)
            if parts[0].strip().isdigit():
                cleaned_code.append(parts[1])
                continue
        cleaned_code.append(line)

    with open(output_path, 'w') as f:
        f.writelines(cleaned_code)

    print(f"Successfully wrote cleaned code to {output_path}")

# This is a template fix for the scratch script
