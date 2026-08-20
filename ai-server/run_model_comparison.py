import os
from app.evaluation.model_comparison import ModelComparator

def main():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    comparator = ModelComparator(project_root)
    comparator.run_comparison()

if __name__ == "__main__":
    main()
