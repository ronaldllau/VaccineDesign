from setuptools import setup, find_packages
import sys
import platform

# Determine Python version
python_version = sys.version_info
py_major, py_minor = python_version.major, python_version.minor

# Define base dependencies
REQUIRED_PACKAGES = [
    # Web framework
    "flask==2.2.3",
    "werkzeug==2.2.3",
    "flask-cors==3.0.10",
    
    # Data processing
    "pandas>=2.0.0",
    "scikit-learn>=1.0.0",
    
    # Visualization
    "matplotlib>=3.5.0",
    "seaborn>=0.12.0",
    
    # ML/DL frameworks
    "transformers>=4.30.0",
    "torchvision>=0.15.2",  # Using a newer version compatible with PyTorch 2.0+
    
    # Common utilities
    "requests>=2.25.0",
    "tqdm>=4.65.0",
    "joblib>=1.2.0",
    "pillow>=9.0.0",
]

# Add numpy with version constraints based on Python version
if py_major == 3 and py_minor >= 10:
    REQUIRED_PACKAGES.append("numpy>=1.25.0")
else:
    REQUIRED_PACKAGES.append("numpy>=1.21.0,<1.26.0")

# Add PyTorch with specific version to avoid compatibility issues
REQUIRED_PACKAGES.append("torch>=2.0.0")  # Using a newer version that's widely available

# Get system information for diagnostic info
system_info = f"Python {sys.version.split()[0]} on {platform.system()} {platform.machine()}"

setup(
    name="transhla-predictor",
    version="0.1.0",
    packages=find_packages(),
    install_requires=REQUIRED_PACKAGES,
    python_requires=">=3.8",
    description="TransHLA: HLA epitope prediction tool",
    author="TransHLA Team",
    author_email="example@example.com",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Science/Research",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Bio-Informatics",
    ],
    keywords="hla,epitope,prediction,transhla,machine learning",
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "flake8>=5.0.0",
            "black>=23.0.0",
        ],
    },
) 