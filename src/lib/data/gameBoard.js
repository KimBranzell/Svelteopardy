export const sampleGameBoard = {
  categories: [
      {
          name: "JavaScript",
          questions: [
              { text: "This keyword refers to the current object", answer: "this", pointValue: 100, revealed: false, answered: false },
              { text: "This loop iterates through an object's properties", answer: "for...in", pointValue: 200, revealed: false, answered: false },
              { text: "This array method creates a new array with elements that pass a test", answer: "filter", pointValue: 300, revealed: false, answered: false },
              { text: "This function creates a new function with a bound 'this' value", answer: "bind", pointValue: 400, revealed: false, answered: false },
              { text: "This pattern uses a function that returns another function", answer: "closure", pointValue: 500, revealed: false, answered: false },
          ]
      },
      {
          name: "Web Development",
          questions: [
              { text: "This defines the structure of a web page", answer: "HTML", pointValue: 100, revealed: false, answered: false },
              { text: "This is used to style web pages", answer: "CSS", pointValue: 200, revealed: false, answered: false },
              { text: "This HTTP method is used to request data from a server", answer: "GET", pointValue: 300, revealed: false, answered: false },
              { text: "This technology allows web pages to update without reloading", answer: "AJAX", pointValue: 400, revealed: false, answered: false },
              { text: "This pattern separates data, UI, and logic", answer: "MVC", pointValue: 500, revealed: false, answered: false },
          ]
      },
      {
          name: "Programming",
          questions: [
              { text: "This sorting algorithm has an average time complexity of O(n log n)", answer: "Quick Sort", pointValue: 100, revealed: false, answered: false },
              { text: "This data structure uses LIFO order", answer: "Stack", pointValue: 200, revealed: false, answered: false },
              { text: "This concept allows a class to inherit from multiple parent classes", answer: "Multiple Inheritance", pointValue: 300, revealed: false, answered: false },
              { text: "This pattern involves objects that observe other objects", answer: "Observer Pattern", pointValue: 400, revealed: false, answered: false },
              { text: "This algorithm finds the shortest path in a weighted graph", answer: "Dijkstra's Algorithm", pointValue: 500, revealed: false, answered: false },
          ]
      },
      {
          name: "Computer Science",
          questions: [
              { text: "This component of a computer performs arithmetic operations", answer: "ALU", pointValue: 100, revealed: false, answered: false },
              { text: "This type of memory is volatile", answer: "RAM", pointValue: 200, revealed: false, answered: false },
              { text: "This networking protocol is connectionless", answer: "UDP", pointValue: 300, revealed: false, answered: false },
              { text: "This system manages computer resources", answer: "Operating System", pointValue: 400, revealed: false, answered: false },
              { text: "This cryptographic concept uses public and private keys", answer: "Asymmetric Encryption", pointValue: 500, revealed: false, answered: false },
          ]
      },
      {
          name: "Databases",
          questions: [
              { text: "This joins two tables without a matching row", answer: "OUTER JOIN", pointValue: 100, revealed: false, answered: false },
              { text: "This database type stores data in documents", answer: "NoSQL", pointValue: 200, revealed: false, answered: false },
              { text: "This ensures database changes are atomic", answer: "Transaction", pointValue: 300, revealed: false, answered: false },
              { text: "This improves query performance by creating a data structure", answer: "Index", pointValue: 400, revealed: false, answered: false },
              { text: "This technique splits data across multiple servers", answer: "Sharding", pointValue: 500, revealed: false, answered: false },
          ]
      }
  ]
};