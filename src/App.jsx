import "./App.css";

function App() {
  return (
    <>
      <h1>Vite x TransformerJS x WebGPU</h1>
      <div className="linksbox">
        <div className="linksboxitem" style={{ backgroundColor: "#de566faa" }}>
          <a href="/qwen">
            <h3>Qwen</h3>
            <p>
              Qwen 3 0.6B ~1.2gb simple Q&A, non-conversationalist, a thinking
              model - add /no_think for non-thinking responses
            </p>
          </a>
        </div>
        <div className="linksboxitem" style={{ backgroundColor: "#005a72aa" }}>
          <a href="/granite">
            <h3>Granite Q&A</h3>
            <p>Granite 4 micro 3.4B ~2.3gb simple Q&A, non-conversationalist</p>
          </a>
        </div>
        <div className="linksboxitem" style={{ backgroundColor: "#005a72aa" }}>
          <a href="/granitechatbot">
            <h3>Granite Chatbot</h3>
            <p>Granite 4 micro 3.4B ~2.3gb conversationalist, worker side history, no KV optimization</p>
          </a>
        </div>
        <div className="linksboxitem" style={{ backgroundColor: "#005a72aa" }}>
          <a href="/granitechatbotalt">
            <h3>Granite Chatbot Alt</h3>
             <p>Granite 4 micro 3.4B ~2.3gb conversationalist, proper client side history, no KV optimization, avatar empty template</p>
          </a>
        </div>
        <div className="linksboxitem" style={{ backgroundColor: "#005a72aa" }}>
          <a href="/gfisbot">
            <h3>GFIS PTA BOT</h3>
            <p>Granite 4 micro 3.4B ~2.3gb conversationalist, proper conversation client side, RAG with json, no KV optimization</p>
          </a>
        </div>
        <div className="linksboxitem" style={{ backgroundColor: "#005a72aa" }}>
          <a href="/gfisbot">
            <h3>GFIS PTA BOT</h3>
            <p>Info</p>
          </a>
        </div>
        {/* <li className="linksboxitem"><a href='/try'>try</a></li> */}
      </div>
    </>
  );
}

export default App;
