import React, { useState, useEffect } from "react";
import { questions as questionData } from "./data";
import { openDB } from "idb";

// Initialize IndexedDB
const initDB = async () => {
  return openDB("questionsDB", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("questions")) {
        const store = db.createObjectStore("questions", {
          keyPath: "id",
        });
        store.createIndex("completed", "completed");
      }
    },
  });
};

// Store questions in IndexedDB
const storeQuestionsInDB = async (db, questions) => {
  const tx = db.transaction("questions", "readwrite");
  const store = tx.objectStore("questions");

  for (let question of questions) {
    const questionWithCompletion = { ...question, completed: false };
    await store.put(questionWithCompletion);
  }

  await tx.done;
};

// Retrieve all questions from IndexedDB
const getQuestionsFromDB = async (db) => {
  const tx = db.transaction("questions", "readonly");
  const store = tx.objectStore("questions");
  return await store.getAll();
};

// Mark question as completed
const markQuestionCompleted = async (db, id, completed) => {
  const tx = db.transaction("questions", "readwrite");
  const store = tx.objectStore("questions");
  const question = await store.get(id);
  question.completed = completed;
  await store.put(question);
  await tx.done;
};

// Count completed questions
const countCompletedQuestions = async (db) => {
  const tx = db.transaction("questions", "readonly");
  const store = tx.objectStore("questions");

  const allQuestions = await store.getAll();
  const completedQuestions = allQuestions.filter((q) => q.completed === true);
  return completedQuestions.length;
};

const Questions = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [db, setDb] = useState(null);

  useEffect(() => {
    const setupDB = async () => {
      const dbInstance = await initDB();
      setDb(dbInstance);

      // Check if questions are already stored in DB
      const storedQuestions = await getQuestionsFromDB(dbInstance);
      if (storedQuestions.length === 0) {
        await storeQuestionsInDB(dbInstance, questionData);
      }

      const allQuestions = await getQuestionsFromDB(dbInstance);
      setQuestions(allQuestions);

      // Retrieve the saved question index from localStorage
      const savedIndex = localStorage.getItem('currentQuestionIndex');
      const initialIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
      setCurrentQuestionIndex(initialIndex);

      const completed = await countCompletedQuestions(dbInstance);
      setCompletedCount(completed);
    };

    setupDB();
  }, []);

  useEffect(() => {
    // Save the current question index to localStorage
    localStorage.setItem('currentQuestionIndex', currentQuestionIndex);
  }, [currentQuestionIndex]);

  const handleNext = () => {
    setCurrentQuestionIndex((prevIndex) =>
      prevIndex === questions.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex((prevIndex) =>
      prevIndex === 0 ? questions.length - 1 : prevIndex - 1
    );
  };

  const handleCheckboxChange = async (e) => {
    const completed = e.target.checked;
    const currentQuestion = questions[currentQuestionIndex];
    await markQuestionCompleted(db, currentQuestion.id, completed);

    // Update local state
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex].completed = completed;
    setQuestions(updatedQuestions);

    // Update completed count
    const completedCount = await countCompletedQuestions(db);
    setCompletedCount(completedCount);
  };

  if (questions.length === 0) {
    return <div>Loading questions...</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="container">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>Question of the Day</span>
          <div className="d-flex align-items-center">
            <input
              type="checkbox"
              checked={currentQuestion.completed}
              onChange={handleCheckboxChange}
              className="me-2"
            />
            <span>Mark as Completed</span>
          </div>
        </div>

        <div className="card-body">
          <h5 className="card-title">{currentQuestion.question}</h5>
          <p className="card-text">{currentQuestion.answer}</p>
        </div>
      </div>
      <div className="navigation">
        <button className="btn btn-primary" onClick={handlePrevious}>
          Previous
        </button>
        <button className="btn btn-primary m-2" onClick={handleNext}>
          Next
        </button>
      </div>
      <div className="completed-count">
        <span>{completedCount} questions completed</span>
      </div>
    </div>
  );
};

export default Questions;
