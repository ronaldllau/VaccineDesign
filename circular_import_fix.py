#!/usr/bin/env python3
"""
This script fixes the circular import issue in torchvision.
Run this before loading the models if you encounter the error:
'partially initialized module 'torchvision' has no attribute 'extension''
"""
import sys
import os
import importlib

def apply_patch():
    # First, try to fix the sys.modules cache
    if 'torchvision' in sys.modules:
        # Remove the problematic module
        print("Removing torchvision from sys.modules cache")
        del sys.modules['torchvision']
    
    # Try to preload torchvision components in the correct order
    try:
        print("Preloading torchvision components...")
        import torch
        import torchvision.extension
        import torchvision.io
        import torchvision.models
        import torchvision.ops
        import torchvision.transforms
        import torchvision.utils
        print("Torchvision components preloaded successfully!")
        return True
    except Exception as e:
        print(f"Error during preloading: {str(e)}")
        return False

def main():
    print("Applying patch for torchvision circular import issue...")
    success = apply_patch()
    if success:
        print("Patch applied successfully!")
    else:
        print("Patch application failed.")
        print("Alternative solution: reinstall torchvision with:")
        print("pip uninstall -y torchvision")
        print("pip install torchvision==0.15.2")

if __name__ == "__main__":
    main() 