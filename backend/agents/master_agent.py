"""
MasterAgent — Entry point that boots the pipeline.
               Starts TrackingAgent which drives all downstream agents.

Flow:
  TrackingAgent (monitor)
    → DecisionAgent (analyze issue)
      → RiskAgent (urgency + garage ranking)
        → SchedulingAgent (garage accept/reject chain)
          → FeedbackAgent (user accept/decline)
            → booking_service (confirmed booking)
            → PriorityAgent (user rejection → notify garage)
"""


class MasterAgent:
    async def start(self):
        from agents.tracking_agent import TrackingAgent
        tracking_agent = TrackingAgent()
        await tracking_agent.monitor_loop()
