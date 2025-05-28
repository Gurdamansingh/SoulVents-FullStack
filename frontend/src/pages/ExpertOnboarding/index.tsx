import React, { useState } from 'react';
import { CheckCircle, BookOpen, Award, Clock } from 'lucide-react';

const ExpertOnboarding = () => {
  const [currentModule, setCurrentModule] = useState(1);
  const totalModules = 6;

  const modules = [
    {
      id: 1,
      title: 'Introduction to Mental Health Support',
      duration: '5 hours',
      completed: true
    },
    {
      id: 2,
      title: 'Active Listening & Communication Skills',
      duration: '8 hours',
      completed: true
    },
    {
      id: 3,
      title: 'Crisis Management & Emergency Protocols',
      duration: '10 hours',
      completed: false
    },
    {
      id: 4,
      title: 'Ethics & Professional Boundaries',
      duration: '6 hours',
      completed: false
    },
    {
      id: 5,
      title: 'Documentation & Record Keeping',
      duration: '4 hours',
      completed: false
    },
    {
      id: 6,
      title: 'Final Assessment',
      duration: '2 hours',
      completed: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Expert Training Program</h1>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-500" />
              <span className="text-gray-600">2 weeks remaining</span>
            </div>
          </div>
          
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-rose-600 bg-rose-200">
                  Progress
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-rose-600">
                  {Math.round((currentModule / totalModules) * 100)}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-rose-200">
              <div
                style={{ width: `${(currentModule / totalModules) * 100}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-rose-500"
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Training Modules */}
          <div className="md:col-span-2 space-y-6">
            {modules.map((module) => (
              <div
                key={module.id}
                className={`bg-white rounded-lg shadow-md p-6 ${
                  currentModule === module.id ? 'border-2 border-rose-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{module.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {module.duration}
                      </div>
                      <div className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-1" />
                        4 Lessons
                      </div>
                    </div>
                  </div>
                  {module.completed ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <button className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600">
                      Start Module
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Certification Progress */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Award className="h-5 w-5 text-rose-500 mr-2" />
                Certification Progress
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Modules Completed</span>
                    <span>2/6</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded">
                    <div className="h-2 bg-rose-500 rounded" style={{ width: '33%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Quiz Score</span>
                    <span>85%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded">
                    <div className="h-2 bg-rose-500 rounded" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Practice Sessions</span>
                    <span>3/5</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded">
                    <div className="h-2 bg-rose-500 rounded" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resources */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Training Resources</h2>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-rose-500 hover:text-rose-600">
                    Training Manual (PDF)
                  </a>
                </li>
                <li>
                  <a href="#" className="text-rose-500 hover:text-rose-600">
                    Code of Ethics
                  </a>
                </li>
                <li>
                  <a href="#" className="text-rose-500 hover:text-rose-600">
                    Emergency Protocols
                  </a>
                </li>
                <li>
                  <a href="#" className="text-rose-500 hover:text-rose-600">
                    Practice Guidelines
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Need Help?</h2>
              <p className="text-gray-600 mb-4">
                Contact your training supervisor for support or clarification.
              </p>
              <button className="w-full bg-rose-500 text-white px-4 py-2 rounded-md hover:bg-rose-600">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpertOnboarding;