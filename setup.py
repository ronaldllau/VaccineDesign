from setuptools import setup, find_packages

setup(
    name="transhla-predictor",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "flask>=2.0.0,<2.3.0",
        "werkzeug>=2.0.0,<2.3.0",
        "numpy>=1.20.0",
        "pandas>=1.3.0",
        "torch>=1.9.0",
        "transformers>=4.15.0",
        "fair-esm>=2.0.0",
        "requests>=2.25.0",
    ],
    python_requires=">=3.8",
    description="TransHLA: HLA epitope prediction tool",
    author="TransHLA Team",
    author_email="example@example.com",
) 