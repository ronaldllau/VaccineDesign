from setuptools import setup, find_packages

setup(
    name="transhla-predictor",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "flask==2.0.1",
        "flask-cors==3.0.10",
        "numpy>=1.20.0",
        "pandas>=1.3.0",
        "torch>=2.0.0",
        "transformers>=4.30.0",
        "fair-esm>=2.0.0",
        "requests>=2.25.0",
    ],
    python_requires=">=3.8",
    description="TransHLA: HLA epitope prediction tool",
    author="Your Name",
    author_email="your.email@example.com",
) 