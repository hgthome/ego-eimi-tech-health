# Tech Health MVP - Dynamic Pitch Deck Appendix Generator

A powerful platform that audits your codebase to build investor confidence through comprehensive technical health analysis.

## 🎯 Project Overview

### 1. Technical Choices and Rationale

Chose Node.JS/Express for familiarity, ease of development and agility, especially considering an MVP where we're testing an idea.

### 2. AI Tool Usage

I've used mostly Cursor with Sonnet 4 in the following way:

- Given the problem, I asked for a concise and clear implementation planning markdown LLM optimized ([IMPLEMENTATION_GUIDE.md](/docs/IMPLEMENTATION_GUIDE.md))
- The suggested implementation was created and split into 4 phases.
- For each implementation phase, the Agent updated the [DEVELOPMENT_LOG.md](/docs/DEVELOPMENT_LOG.md), so i could review and course correct.
- I implemented by phases, reviewed and tested validating base functionality before each phase commit.
- After all four phases were correctly implemented, I began testing locally and correcting eventual mistakes/bugs.
- With the base functionality working as expected, I implemented unit testing with moderate coverage.

### 3. The Core Problem

The solution has basic but working reporting capabilities with graphs, easy to understand actions and suggestions and a clean look. When scaling this project, we could:

- Refine score considerations/code complexity models
- Implement better commit tracking with DORA
- Improve benchmarking capacity and handle library scanning better (different/configurable sources)
- Add optional report categories (focused on libs, code, etc)
- Possibly implement LLM code reviewing and suggestions

### 4. Development Time

- Planning/Implementing Phase 1 to 4 = 1 hour
- Frontend/oauth/additional fixes/course correction = 30 minutes
- Report refinement, improvement, code complexity scan = 45 minutes
- Jest unit testing, final review = 30 minutes
- Total: 2h 45m

## 📄 License

MIT License - see LICENSE file for details.
