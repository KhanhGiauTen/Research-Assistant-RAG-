from langchain_community.document_loaders import DirectoryLoader, UnstructuredFileLoader
from langchain_community.vectorstores import FAISS
from langchain_community.vectorstores.utils import DistanceStrategy
from langchain_text_splitters import RecursiveCharacterTextSplitter
# mục đích của RecursiveCharacterTextSplitter là để chia nhỏ các tài liệu thành phần nhỏ hơn theo kí tự phân tách tự nhiên, nếu đoạn vẫn còn quá dài, nó sẽ tiếp tục chia nhỏ hơn
from langchain_openai import OpenAIEmbeddings,ChatOpenAI
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate


load_dotenv()
loader = DirectoryLoader(
    path ="./papers",
    glob = "**/*.pdf",
    loader_cls=UnstructuredFileLoader,
    show_progress = True,
    use_multithreading = True
)

docs = loader.load()

# print(docs)
# print(len(docs))

# Có thể dùng chunkViz để check chunk size phù hợp

MARKDOWN_SEPARATOR = [
    "\n#{1-6}",
    "\n",
    "\n\\*\\*\\*+\n",
    "\n---+\n",
    "\n___+\n",
    "\n\n",
    "\n",
    " ",
    "",
]
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size = 1200,
    chunk_overlap = 200,    #chunk overlap là số lượng ký tự mà các đoạn văn bản sẽ chồng lên nhau khi được chia nhỏ (tránh bị mất thông tin quan trọng nếu bị ngắt)
    add_start_index = True,
    shift_whitespace = True,
    separators = MARKDOWN_SEPARATOR 
)

splits = text_splitter.split_documents(docs)

# from pprint import pprint 
embeddings = OpenAIEmbeddings(
    model = "text-embedding-3-small"
)

vectorstore = FAISS.from_documents(
    documents = splits,
    embeddings = embeddings,
    distance_strategy = DistanceStrategy.COSINE
)

retriever = vectorstore.as_retriever(
    search_type = "similarity_score_threshold",
    search_kwargs ={
        "k" : 5,
        "score_threshold" : 0.2
    }
)

template =(
    "You are a strict, citation-focused assistant for a private knowledge base. \n"
    "RULES: \n"
    "1) Use ONLY the provided context to answer.\n"
    "2) If the answer is not clearly contained in the context, say: "
    "\"I don't know based on the provided documents.\"\n"
    "3) Do NOT use outside knowledge, guessing, or web information.\n"
    "4) If applicable, cite sources as (source:page) using the metadata. \n\n"
    "Context: \n{context}\n\n"
    "Question: {question}"
)

prompt = ChatPromptTemplate.from_template(template)

llm = ChatOpenAI(
    model = "",
    temperature = 0
    
)