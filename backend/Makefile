.PHONY: run build clean

# Build with external linker (required for macOS Tahoe + Go 1.26+)
build:
	CGO_ENABLED=1 go build -ldflags "-linkmode external" -o studybuddy-backend .

run: build
	./studybuddy-backend

clean:
	rm -f studybuddy-backend
