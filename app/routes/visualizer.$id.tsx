import { useLocation } from "react-router"


const VisualizerIdRoute = () => {
  const location = useLocation();
  const state = location.state as VisualizerLocationState | null;
  const { initialImage, name } = state || {};

  return (
    <><section>
      <h1> {name || 'Untitled Project'} </h1>

      <div className="visualizer">
        {initialImage && (
          <div className="image-container">
            <h2>Source Image</h2>
            <img src={initialImage} alt="source" />
          </div>
        )}
      </div>
    </section><div>

      </div></>
  )
}

export default VisualizerIdRoute

