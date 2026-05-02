import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Select, 
  Tag, 
  Checkbox, 
  message, 
  Input, 
  Row, 
  Col,
  Statistic,
  Divider,
  Empty,
  Spin
} from 'antd';
import { 
  BellOutlined, 
  SearchOutlined, 
  SendOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { statsAPI, teamAPI } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Group: CheckboxGroup } = Checkbox;

const getCurrentWeek = () => {
  const today = new Date();
  const year = today.getFullYear();
  const week = Math.ceil((today - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  return `${year}W${week.toString().padStart(2, '0')}`;
};

const Reminder = () => {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [teams, setTeams] = useState([]);
  const [unsubmitted, setUnsubmitted] = useState(null);
  const [filters, setFilters] = useState({
    week: getCurrentWeek(),
    team_id: null,
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [reminderMessage, setReminderMessage] = useState('请及时提交本周周报，谢谢！');

  const fetchTeams = async () => {
    try {
      const response = await teamAPI.getAll();
      setTeams(response.data);
    } catch (error) {
      console.error('获取团队列表失败', error);
    }
  };

  const fetchUnsubmitted = async () => {
    setLoading(true);
    try {
      const params = { week: filters.week };
      if (filters.team_id) {
        params.team_id = filters.team_id;
      }
      const response = await statsAPI.getUnsubmitted(params);
      setUnsubmitted(response.data);
      setSelectedUsers([]);
    } catch (error) {
      message.error('获取未提交列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchUnsubmitted();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSearch = () => {
    fetchUnsubmitted();
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(unsubmitted?.unsubmitted_members?.map(m => m.id) || []);
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (checkedValues) => {
    setSelectedUsers(checkedValues);
  };

  const handleSendReminders = async () => {
    if (selectedUsers.length === 0) {
      message.warning('请选择要提醒的成员');
      return;
    }
    
    setSending(true);
    try {
      await statsAPI.sendReminders({
        user_ids: selectedUsers,
        week: filters.week,
        message: reminderMessage,
      });
      message.success(`已向 ${selectedUsers.length} 位成员发送提醒`);
      fetchUnsubmitted();
    } catch (error) {
      message.error(error.response?.data?.msg || '发送提醒失败');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        <BellOutlined style={{ marginRight: 8 }} />
        催报管理
      </Title>
      
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Select
            placeholder="选择周次"
            value={filters.week}
            onChange={(value) => handleFilterChange('week', value)}
            style={{ width: 150 }}
          >
            {Array.from({ length: 10 }, (_, i) => {
              const today = new Date();
              const year = today.getFullYear();
              const currentWeek = Math.ceil((today - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
              let week = currentWeek - i;
              let displayYear = year;
              if (week < 1) {
                week = 52 + week;
                displayYear = year - 1;
              }
              const weekStr = `${displayYear}W${week.toString().padStart(2, '0')}`;
              return <Option key={weekStr} value={weekStr}>{weekStr}</Option>;
            })}
          </Select>
          
          <Select
            placeholder="选择团队（可选）"
            value={filters.team_id || undefined}
            onChange={(value) => handleFilterChange('team_id', value)}
            style={{ width: 180 }}
            allowClear
          >
            {teams.map(team => (
              <Option key={team.id} value={team.id}>
                {team.name}
              </Option>
            ))}
          </Select>
          
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
        </Space>
      </Card>

      <Spin spinning={loading}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总成员数"
                value={unsubmitted?.total_members || 0}
                prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已提交"
                value={unsubmitted?.submitted_count || 0}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="未提交"
                value={unsubmitted?.unsubmitted_count || 0}
                prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="提交率"
                value={unsubmitted ? Math.round((unsubmitted.submitted_count / Math.max(unsubmitted.total_members, 1)) * 100) : 0}
                suffix="%"
                prefix={<BellOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={16}>
            <Card 
              title={
                <span>
                  <UserOutlined style={{ marginRight: 8 }} />
                  未提交人员名单 - {filters.week}
                </span>
              }
              extra={
                unsubmitted?.unsubmitted_members?.length > 0 && (
                  <Checkbox
                    checked={selectedUsers.length === unsubmitted?.unsubmitted_members?.length && unsubmitted?.unsubmitted_members?.length > 0}
                    indeterminate={selectedUsers.length > 0 && selectedUsers.length < unsubmitted?.unsubmitted_members?.length}
                    onChange={handleSelectAll}
                  >
                    全选
                  </Checkbox>
                )
              }
            >
              {!loading && unsubmitted?.unsubmitted_members?.length === 0 ? (
                <Empty 
                  description={
                    <Text type="success">
                      <CheckCircleOutlined style={{ marginRight: 4 }} />
                      所有人都已提交周报！
                    </Text>
                  }
                />
              ) : (
                <CheckboxGroup
                  value={selectedUsers}
                  onChange={handleSelectUser}
                >
                  <Row gutter={[16, 16]}>
                    {unsubmitted?.unsubmitted_members?.map(member => (
                      <Col span={8} key={member.id}>
                        <Card 
                          size="small" 
                          style={{ 
                            background: '#fff7e6',
                            cursor: 'pointer',
                            border: selectedUsers.includes(member.id) ? '1px solid #1890ff' : '1px solid #ffe58f'
                          }}
                          hoverable
                        >
                          <Checkbox value={member.id}>
                            <div>
                              <Text strong>{member.real_name}</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {member.team_name || '无团队'}
                              </Text>
                            </div>
                          </Checkbox>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </CheckboxGroup>
              )}
            </Card>
          </Col>

          <Col span={8}>
            <Card title={<span><SendOutlined style={{ marginRight: 8 }} />发送提醒</span>}>
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">已选择：</Text>
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {selectedUsers.length} 人
                </Tag>
              </div>

              <Divider />

              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  提醒消息：
                </Text>
                <TextArea
                  rows={4}
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  placeholder="请输入提醒消息"
                />
              </div>

              <Button
                type="primary"
                danger
                icon={<BellOutlined />}
                onClick={handleSendReminders}
                loading={sending}
                disabled={selectedUsers.length === 0}
                block
                size="large"
              >
                一键催报（{selectedUsers.length} 人）
              </Button>

              <Divider />

              <div style={{ fontSize: 12, color: '#999' }}>
                <Text type="secondary">提示：</Text>
                <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                  <li>选择左侧需要提醒的成员</li>
                  <li>可以自定义提醒消息</li>
                  <li>点击"一键催报"发送提醒</li>
                </ul>
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default Reminder;
