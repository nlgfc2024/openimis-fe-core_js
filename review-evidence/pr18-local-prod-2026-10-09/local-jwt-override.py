# Appended only to the temporary assembler settings/__init__.py.
# Set by control.py start short-jwt; absent during baseline and restart checks.
if os.environ.get("LOCAL_AUTH_JWT_SECONDS"):
    GRAPHQL_JWT["JWT_EXPIRATION_DELTA"] = timedelta(seconds=int(os.environ["LOCAL_AUTH_JWT_SECONDS"]))
