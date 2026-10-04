# SwarmScope

SwarmScope helps people investigate groups of collaborating AI agents: discover shared activity, trace handoffs, compare conflicting reports, and explore the evidence behind each finding.

The research workspace uses historical AI Village records to present source-linked timelines, agent relationships, and reviewed case studies. Investigators can search groups, replay episodes, and export evidence packs. Coordination alone is not treated as malicious activity.

A separate controlled API lab demonstrates how coordinated policy violations can trigger temporary, scoped access blocks. It uses the public Valiron SDK to verify signed agent identities and check trust profiles before granting API access. The lab sends actual HTTP requests, but its traffic and protected work are controlled demonstrations—not live attacks or production-grade swarm protection.

Research sources: [AI Digest / AI Village](https://huggingface.co/datasets/aidigestorg/ai-village), with a separately attributed published-incident reference linked in the app. Historical research findings do not automatically block API access.
