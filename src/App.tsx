import TitleBar from "./components/TitleBar";

function App() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TitleBar />
      <div className="flex-1 overflow-auto p-4">

      </div>
    </div>
  );
}

export default App;
