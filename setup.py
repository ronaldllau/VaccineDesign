from setuptools import setup, find_packages

setup(
    name="transhla-predictor",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "flask==2.2.3",
        "werkzeug==2.2.3",
        "flask-cors==3.0.10",
        "numpy>=1.26.0",
        "pandas>=2.0.0",
        "torch>=2.0.0",
        "transformers>=4.30.0",
        "requests>=2.25.0",
        # fair-esm is installed separately in setup.sh due to build issues with pip's dependency resolver
    ],
    python_requires=">=3.8",
    description="TransHLA: HLA epitope prediction tool",
    author="TransHLA Team",
    author_email="example@example.com",
) 