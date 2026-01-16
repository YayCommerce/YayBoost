#!/bin/bash
set -eo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

function help {
	echo -e "${BLUE}YayBoost Development Script${NC}"
	echo ""
	echo "Available commands:"
	echo -e "  ${GREEN}dev-init${NC}    - Install all dependencies (PHP + JS)"
	echo -e "  ${GREEN}dev${NC}         - Start Vite development server"
	echo -e "  ${GREEN}build${NC}       - Build production assets only"
	echo -e "  ${GREEN}release${NC}     - Build and create distribution zip"
	echo -e "  ${GREEN}test${NC}        - Run PHPUnit tests"
	echo -e "  ${GREEN}help${NC}        - Show this help message"
	echo ""
	echo "Usage: ./run.sh [command]"
	echo ""
}

function dev-init {
	echo -e "${YELLOW}Installing dependencies...${NC}"
	cd .. && composer install && cd apps/admin-settings && pnpm install
	echo -e "${GREEN}✓ Dependencies installed${NC}"
}

function dev {
	echo -e "${YELLOW}Starting development server...${NC}"
	cd .. && cd apps/admin-settings && pnpm dev
}

function build {
	echo -e "${YELLOW}Building production assets...${NC}"
	cd .. && cd apps/admin-settings && pnpm build
	echo -e "${GREEN}✓ Build complete${NC}"
}

function release {
	echo -e "${YELLOW}Starting release build...${NC}"
	./release.sh
}

function test {
	echo -e "${YELLOW}Running PHPUnit tests...${NC}"
	cd .. && ./vendor/bin/phpunit
}

TIMEFORMAT=$'\nTask completed in %3lR'
time "${@:-help}"