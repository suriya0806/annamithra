# ==============================================================================
# Multi-stage Dockerfile for SAMAYA / ANNAMITHRA Backend (ASP.NET Core Web API)
# Target Runtime: .NET 10
# Deployment Target: Render (Docker Web Service)
# ==============================================================================

# Stage 1: Build & Publish using official .NET 10 SDK
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies (leveraging Docker layer cache)
COPY ["Samaya.API.csproj", "./"]
RUN dotnet restore "Samaya.API.csproj"

# Copy remaining source code and build/publish Release bundle
COPY . .
RUN dotnet publish "Samaya.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Minimal Production Runtime using official .NET 10 ASP.NET image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Expose default HTTP port
EXPOSE 8080

# Configure container networking defaults
# Render injects PORT dynamically; we default to 8080
ENV PORT=8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
ENV ASPNETCORE_FORWARDEDHEADERS_ENABLED=true

# Copy published application from build stage
COPY --from=build /app/publish .

# Start the application using Render's PORT environment variable
# The assembly name is Samaya.Server.dll (configured in Samaya.API.csproj)
ENTRYPOINT ["sh", "-c", "export ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} && exec dotnet Samaya.Server.dll"]
