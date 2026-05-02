from langchain_community.document_loaders import DirectoryLoader, UnstructuredFileLoader

loader = DirectoryLoader(
    path ="./papers",
    glob = "**/*.pdf",
    loader_cls=UnstructuredFileLoader,
    show_progress = True,
    use_multithreading = True
)

docs = loader.load()

print(docs)
print(len(docs))
