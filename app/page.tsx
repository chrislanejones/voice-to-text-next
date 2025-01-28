import ElectronAnimation from "./components/lectronAnimation";
import DictationApp from "./components/DictationApp";
export default function Home() {
  return (
    <main className="flex min-h-screen bg-gray-900">
      <DictationApp />
      <ElectronAnimation />
    </main>
  );
}
