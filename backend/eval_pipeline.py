import pandas as pd
import numpy as np
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
    answer_correctness
)
from langchain_huggingface import HuggingFaceEmbeddings
from dotenv import load_dotenv
from ollama_model import create_chat_model
import re
from typing import List, Dict, Tuple
import json

# Import your RAG engine
try:
    from rag_engine import rag_engine 
    print("✅ Successfully imported LegalRAG Engine.")
except ImportError:
    print("❌ Error: Could not import 'rag_engine'. Ensure rag_engine.py is accessible.")
    exit(1)

load_dotenv()

# --- CONFIGURATION ---
EMBEDDING_MODEL = "AkshitaS/bhasha-embed-v0"

class LegalRAGEvaluator:
    """
    Comprehensive evaluation suite for Legal RAG system.
    Tests: Accuracy, Language Handling, Section Mapping, Comparison Logic
    """
    
    def __init__(self):
        self.judge_llm = create_chat_model()
        
        self.eval_embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        
        # Test categories
        self.test_suites = {
            "factual_accuracy": self._get_factual_tests(),
            "section_mapping": self._get_section_mapping_tests(),
            "language_handling": self._get_language_tests(),
            "comparison_logic": self._get_comparison_tests(),
            "edge_cases": self._get_edge_case_tests()
        }
    
    def _get_factual_tests(self) -> List[Dict]:
        """Tests for basic legal fact retrieval"""
        return [
            {
                "question": "What is the punishment for murder under IPC Section 302?",
                "ground_truth": "Under Section 302 of the IPC, the punishment for murder is death penalty or imprisonment for life, and the offender shall also be liable to fine.",
                "expected_sections": ["302"],
                "law_type": "IPC"
            },
            {
                "question": "What does BNS Section 103(2) specifically address?",
                "ground_truth": "BNS Section 103(2) introduces a specific provision for mob lynching, punishing groups of five or more persons acting on grounds of race, caste, community, sex, place of birth, language, personal belief or any other similar ground with death penalty or life imprisonment.",
                "expected_sections": ["103(2)", "103"],
                "law_type": "BNS"
            },
            {
                "question": "Define snatching under the new criminal law.",
                "ground_truth": "Snatching is defined as a distinct offense under Section 304 of the Bharatiya Nyaya Sanhita (BNS), where it is separated from general theft and treated as a specific crime involving sudden force or intimidation to take property from a person.",
                "expected_sections": ["304"],
                "law_type": "BNS"
            },
            {
                "question": "What is the punishment for theft under IPC?",
                "ground_truth": "Under Section 379 of the IPC, theft is punishable with imprisonment of either description for a term which may extend to three years, or with fine, or with both.",
                "expected_sections": ["379"],
                "law_type": "IPC"
            }
        ]
    
    def _get_section_mapping_tests(self) -> List[Dict]:
        """Tests to ensure correct section number identification"""
        return [
            {
                "question": "Which BNS section deals with snatching?",
                "ground_truth": "Section 304 of the BNS deals with snatching.",
                "expected_sections": ["304"],
                "law_type": "BNS",
                "must_not_confuse": "IPC 304 (culpable homicide)"
            },
            {
                "question": "What is BNS Section 103 about?",
                "ground_truth": "BNS Section 103 deals with murder, and Section 103(2) specifically addresses mob lynching.",
                "expected_sections": ["103"],
                "law_type": "BNS"
            },
            {
                "question": "Tell me about IPC Section 304.",
                "ground_truth": "IPC Section 304 deals with punishment for culpable homicide not amounting to murder, prescribing imprisonment for life or imprisonment for a term up to 10 years with fine.",
                "expected_sections": ["304"],
                "law_type": "IPC",
                "must_not_confuse": "BNS 304 (snatching)"
            }
        ]
    
    def _get_language_tests(self) -> List[Dict]:
        """Tests for Hindi/Hinglish language handling"""
        return [
            {
                "question": "BNS में snatching की saza kya hai?",
                "ground_truth": "BNS की धारा 304 के तहत snatching के लिए 3 साल तक की कैद या जुर्माना या दोनों की सजा हो सकती है।",
                "expected_language": "Hindi/Hinglish",
                "expected_sections": ["304"],
                "law_type": "BNS"
            },
            {
                "question": "Mob lynching ke liye kaunsa section hai?",
                "ground_truth": "Mob lynching के लिए BNS की धारा 103(2) है, जो 5 या अधिक लोगों द्वारा जाति, धर्म आदि के आधार पर हत्या करने पर मौत की सजा या आजीवन कारावास देती है।",
                "expected_language": "Hindi/Hinglish",
                "expected_sections": ["103(2)", "103"],
                "law_type": "BNS"
            },
            {
                "question": "What is the English term for 'अपहरण'?",
                "ground_truth": "The English term for 'अपहरण' is 'kidnapping' or 'abduction'.",
                "expected_language": "English"
            }
        ]
    
    def _get_comparison_tests(self) -> List[Dict]:
        """Tests for IPC vs BNS comparison logic"""
        return [
            {
                "question": "Compare theft provisions in IPC vs BNS",
                "ground_truth": "IPC Section 379 defines theft with imprisonment up to 3 years. BNS maintains similar provisions but Section 304 specifically separates snatching as a distinct offense, which was not explicitly differentiated in IPC.",
                "expected_sections": ["379", "304"],
                "comparison_required": True
            },
            {
                "question": "What are the key differences between IPC and BNS regarding mob violence?",
                "ground_truth": "BNS Section 103(2) introduces a specific provision for mob lynching involving groups of 5 or more persons, which was not explicitly defined in IPC. This is a major addition in the new criminal law.",
                "expected_sections": ["103(2)", "103"],
                "comparison_required": True
            }
        ]
    
    def _get_edge_case_tests(self) -> List[Dict]:
        """Tests for handling ambiguous or tricky queries"""
        return [
            {
                "question": "What is Section 304?",
                "ground_truth": "The answer depends on context: IPC Section 304 deals with culpable homicide not amounting to murder, while BNS Section 304 deals with snatching. Please specify which law you're asking about.",
                "ambiguous": True,
                "expected_sections": ["304"]
            },
            {
                "question": "Tell me about completely fictional Section 9999",
                "ground_truth": "No such section exists in IPC or BNS. The system should indicate this section is not found in the legal corpus.",
                "should_not_hallucinate": True
            }
        ]
    
    def _extract_sections_from_text(self, text: str) -> List[str]:
        """Extract section numbers from text"""
        pattern = r"(?:Section|Sec\.?|धारा)\s+([0-9]+[A-Za-z]*(?:\([0-9A-Za-z]+\))?)"
        matches = re.findall(pattern, text, re.IGNORECASE)
        return list(set(matches))
    
    def _detect_language(self, text: str) -> str:
        """Detect if response is in English, Hindi, or Hinglish"""
        hindi_chars = len(re.findall(r'[\u0900-\u097F]', text))
        total_chars = len(text.replace(' ', ''))
        
        if total_chars == 0:
            return "Unknown"
        
        hindi_ratio = hindi_chars / total_chars
        
        if hindi_ratio > 0.3:
            return "Hindi/Hinglish"
        elif hindi_ratio > 0.05:
            return "Hinglish"
        else:
            return "English"
    
    def _check_section_accuracy(self, answer: str, expected_sections: List[str], 
                                must_not_confuse: str = None) -> Dict:
        """Verify correct sections are mentioned"""
        found_sections = self._extract_sections_from_text(answer)
        
        matches = [sec for sec in expected_sections if sec in found_sections]
        match_ratio = len(matches) / len(expected_sections) if expected_sections else 0
        
        confusion_detected = False
        if must_not_confuse and must_not_confuse.lower() in answer.lower():
            confusion_detected = True
        
        return {
            "expected": expected_sections,
            "found": found_sections,
            "matches": matches,
            "match_ratio": match_ratio,
            "confusion_detected": confusion_detected
        }
    
    def run_suite(self, suite_name: str) -> Tuple[pd.DataFrame, Dict]:
        """Run a specific test suite"""
        print(f"\n{'='*70}")
        print(f"🧪 Running Test Suite: {suite_name.upper()}")
        print(f"{'='*70}")
        
        test_cases = self.test_suites[suite_name]
        
        questions = []
        ground_truths = []
        answers = []
        contexts = []
        custom_metrics = []
        
        for idx, test in enumerate(test_cases, 1):
            q = test["question"]
            gt = test["ground_truth"]
            
            print(f"\n[{idx}/{len(test_cases)}] Query: {q[:80]}...")
            
            # Query RAG engine
            generated_ans, sources = rag_engine.query(q)
            
            # Extract contexts
            retrieved_context = [s.get('preview', '') for s in sources]
            
            # Custom metrics
            metrics = {
                "test_id": idx,
                "question": q
            }
            
            # Section accuracy check
            if "expected_sections" in test:
                section_check = self._check_section_accuracy(
                    generated_ans, 
                    test["expected_sections"],
                    test.get("must_not_confuse")
                )
                metrics["section_accuracy"] = section_check["match_ratio"]
                metrics["sections_found"] = ", ".join(section_check["found"])
                metrics["confusion_detected"] = section_check["confusion_detected"]
            
            # Language check
            if "expected_language" in test:
                detected_lang = self._detect_language(generated_ans)
                metrics["expected_language"] = test["expected_language"]
                metrics["detected_language"] = detected_lang
                metrics["language_match"] = (
                    test["expected_language"].split("/")[0] in detected_lang
                )
            
            # Comparison check
            if test.get("comparison_required"):
                has_comparison = ("ipc" in generated_ans.lower() and 
                                "bns" in generated_ans.lower())
                metrics["has_comparison"] = has_comparison
            
            # Hallucination check
            if test.get("should_not_hallucinate"):
                has_not_found = any(phrase in generated_ans.lower() 
                                   for phrase in ["not found", "does not exist", 
                                                 "no such section", "नहीं मिला"])
                metrics["correctly_refused"] = has_not_found
            
            questions.append(q)
            ground_truths.append(gt)
            answers.append(generated_ans)
            contexts.append(retrieved_context)
            custom_metrics.append(metrics)
        
        # Run RAGAS evaluation
        print(f"\n🔬 Running RAGAS metrics for {suite_name}...")
        ragas_results = self._run_ragas(questions, ground_truths, answers, contexts)
        
        # Combine results
        results_df = ragas_results.to_pandas()
        custom_df = pd.DataFrame(custom_metrics)
        
        combined_df = pd.concat([custom_df, results_df], axis=1)
        
        # Calculate suite statistics
        stats = self._calculate_suite_stats(combined_df, suite_name)
        
        return combined_df, stats
    
    def _run_ragas(self, questions, ground_truths, answers, contexts):
        """Run RAGAS evaluation"""
        data_dict = {
            "question": questions,
            "answer": answers,
            "contexts": contexts,
            "ground_truth": ground_truths
        }
        dataset = Dataset.from_dict(data_dict)
        
        return evaluate(
            dataset=dataset,
            metrics=[
                context_precision,
                context_recall,
                faithfulness,
                answer_relevancy,
            ],
            llm=self.judge_llm,
            embeddings=self.eval_embeddings
        )
    
    def _calculate_suite_stats(self, df: pd.DataFrame, suite_name: str) -> Dict:
        """Calculate statistics for a test suite"""
        stats = {
            "suite_name": suite_name,
            "total_tests": len(df),
        }
        
        # RAGAS metrics
        for metric in ['faithfulness', 'answer_relevancy', 'context_precision', 'context_recall']:
            if metric in df.columns:
                stats[f"avg_{metric}"] = df[metric].mean()
        
        # Custom metrics
        if "section_accuracy" in df.columns:
            stats["avg_section_accuracy"] = df["section_accuracy"].mean()
        
        if "language_match" in df.columns:
            stats["language_accuracy"] = df["language_match"].mean()
        
        if "confusion_detected" in df.columns:
            stats["confusion_rate"] = df["confusion_detected"].mean()
        
        if "correctly_refused" in df.columns:
            stats["hallucination_prevention"] = df["correctly_refused"].mean()
        
        return stats
    
    def run_full_evaluation(self) -> Dict:
        """Run all test suites and generate comprehensive report"""
        print("\n" + "="*70)
        print("🚀 STARTING COMPREHENSIVE LEGAL RAG EVALUATION")
        print("="*70)
        
        all_results = {}
        all_stats = {}
        
        for suite_name in self.test_suites.keys():
            df, stats = self.run_suite(suite_name)
            all_results[suite_name] = df
            all_stats[suite_name] = stats
            
            # Save individual suite results
            df.to_csv(f"eval_results_{suite_name}.csv", index=False)
            print(f"💾 Saved: eval_results_{suite_name}.csv")
        
        # Generate summary report
        self._generate_summary_report(all_stats)
        
        # Save complete stats
        with open("eval_summary_stats.json", "w") as f:
            json.dump(all_stats, f, indent=2)
        
        return all_results, all_stats
    
    def _generate_summary_report(self, all_stats: Dict):
        """Generate and print summary report"""
        print("\n" + "="*70)
        print("📊 EVALUATION SUMMARY REPORT")
        print("="*70)
        
        for suite_name, stats in all_stats.items():
            print(f"\n📋 {suite_name.upper().replace('_', ' ')}")
            print("-" * 70)
            
            for key, value in stats.items():
                if key == "suite_name":
                    continue
                if isinstance(value, float):
                    print(f"  {key:.<40} {value:.3f}")
                else:
                    print(f"  {key:.<40} {value}")
        
        # Overall score
        print("\n" + "="*70)
        print("🎯 OVERALL SYSTEM PERFORMANCE")
        print("="*70)
        
        overall_faithfulness = np.mean([s.get("avg_faithfulness", 0) for s in all_stats.values()])
        overall_relevancy = np.mean([s.get("avg_answer_relevancy", 0) for s in all_stats.values()])
        overall_precision = np.mean([s.get("avg_context_precision", 0) for s in all_stats.values()])
        overall_recall = np.mean([s.get("avg_context_recall", 0) for s in all_stats.values()])
        
        print(f"  Average Faithfulness:............ {overall_faithfulness:.3f}")
        print(f"  Average Answer Relevancy:........ {overall_relevancy:.3f}")
        print(f"  Average Context Precision:....... {overall_precision:.3f}")
        print(f"  Average Context Recall:.......... {overall_recall:.3f}")
        
        composite_score = (overall_faithfulness + overall_relevancy + 
                          overall_precision + overall_recall) / 4
        print(f"\n  🏆 COMPOSITE SCORE:.............. {composite_score:.3f}")
        
        # Grade
        if composite_score >= 0.85:
            grade = "A (Excellent)"
        elif composite_score >= 0.75:
            grade = "B (Good)"
        elif composite_score >= 0.65:
            grade = "C (Acceptable)"
        else:
            grade = "D (Needs Improvement)"
        
        print(f"  📈 GRADE:........................ {grade}")
        print("="*70)


# --- MAIN EXECUTION ---
if __name__ == "__main__":
    evaluator = LegalRAGEvaluator()
    
    # Option 1: Run full evaluation
    print("\n🔍 Choose evaluation mode:")
    print("1. Full Evaluation (All Suites)")
    print("2. Quick Evaluation (Factual + Section Mapping only)")
    print("3. Custom Suite Selection")
    
    mode = input("\nEnter choice (1-3) [default: 1]: ").strip() or "1"
    
    if mode == "1":
        results, stats = evaluator.run_full_evaluation()
    
    elif mode == "2":
        results = {}
        stats = {}
        for suite in ["factual_accuracy", "section_mapping"]:
            df, s = evaluator.run_suite(suite)
            results[suite] = df
            stats[suite] = s
        evaluator._generate_summary_report(stats)
    
    else:
        print("\nAvailable suites:")
        for i, suite in enumerate(evaluator.test_suites.keys(), 1):
            print(f"{i}. {suite}")
        
        selected = input("\nEnter suite numbers (comma-separated): ").strip()
        suite_names = list(evaluator.test_suites.keys())
        
        results = {}
        stats = {}
        for idx in selected.split(","):
            suite = suite_names[int(idx.strip()) - 1]
            df, s = evaluator.run_suite(suite)
            results[suite] = df
            stats[suite] = s
        
        evaluator._generate_summary_report(stats)
    
    print("\n✅ Evaluation complete! Check the generated CSV files for detailed results.")