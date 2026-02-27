.PHONY: build clean full test coverage codegen deploy

build:
	forge install
	forge build

clean:
	rm -rf out lib

full:
	make clean
	make build

test:
	forge test -vvv --match-path "test/*"

coverage:
	forge coverage --report lcov --match-path "test/*"

codegen:
	make build
	cd ../.. && npm ci && npm run codegen

deploy:
	@echo "Use ../../scripts/deploy-contracts.sh <group> <chain1> [chain2] ..."
	@echo "Run ../../scripts/deploy-contracts.sh --help for details."
	@exit 1
