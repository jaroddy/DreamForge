'use client'
import FileUploadComponent from './components/uploadFIleModal';
import { useRouter } from 'next/navigation';

const Home = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-bl from-blue-500 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-4xl font-bold text-center mb-8">
          <div className="p-4 rounded-2xl">
            <span className="text-white py-3">DreamForge</span>
          </div>
          <p className="text-white text-xl font-normal mt-2">
            Create & Print Your 3D Models
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* AI Generation Option */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition duration-300">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🤖</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Generate with AI
                </h2>
                <p className="text-gray-600">
                  Describe your idea and let AI create a 3D model for you
                </p>
              </div>
              
              <button
                onClick={() => router.push('/generate')}
                className="w-full px-6 py-4 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold transition duration-300 transform hover:scale-105"
              >
                Start Creating
              </button>
              
              <div className="mt-4 text-sm text-gray-500 text-center">
                ✨ Powered by Meshy AI
              </div>
            </div>
            
            {/* Upload STL Option */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition duration-300">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📁</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Upload STL File
                </h2>
                <p className="text-gray-600">
                  Have your own 3D model? Upload and print it
                </p>
              </div>
              
              <FileUploadComponent />
            </div>
          </div>
          
          {/* My Models Button */}
          <div className="text-center">
            <button
              onClick={() => router.push('/my-models')}
              className="px-8 py-3 bg-white hover:bg-gray-100 text-blue-500 rounded-lg font-bold transition duration-300"
            >
              View My Models
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
