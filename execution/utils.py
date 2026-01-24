import os
import json

def load_env():
    """Simple env loader if .env exists"""
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value

def save_intermediate(data, filename):
    """Save data to the .tmp/ directory"""
    os.makedirs('.tmp', exist_ok=True)
    path = os.path.join('.tmp', filename)
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Saved to {path}")

if __name__ == "__main__":
    print("Agent Execution Environment initialized.")
